import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Handoff, HasTurn, NextAtStart } from '../types'

// The heading relay:setup writes into AGENTS.md; every relay skill looks for it.
const RELAY_SECTION = /^## Relay workflow[ \t]*$/m

// Whether the conversation has had a model turn. Kept in session state, not
// $.session.turns(), because a /clear fires no session.start and the band's
// drawing is cached: only a state write (or an invalidate) redraws it.
const hasTurn = atom({ plugin: 'relay-band', key: 'hasTurn' } as const, false as HasTurn)

// What a turn compares the Next block against to tell whether this
// conversation queued a step, and the step it queued, once a turn that
// answered leaves the block changed. Both start over with the conversation.
const nextAtStart = atom({ plugin: 'relay-band', key: 'nextAtStart' } as const, null as NextAtStart)
const handoff = atom({ plugin: 'relay-band', key: 'handoff' } as const, null as Handoff)

// The section's setting that moves the status file, and where it is otherwise.
const STATUS_SETTING = /^- \*\*Status:\*\* `([^`]+)`/m
const DEFAULT_STATUS = '.relay/status.md'

// The status file's absolute path, or undefined where the repo has no relay
// section. The repo's root is the main working tree's, where the file lives.
const findStatusPath = async ($: EngineInterface) => {
  const root = (await $.session.repo())?.root ?? (await $.session.cwd())
  let agents: string
  try {
    agents = await $.fs.read(`${root}/AGENTS.md`)
  } catch {
    return undefined
  }
  const section = sectionAfter(agents, RELAY_SECTION)
  if (section === undefined) {
    return undefined
  }
  const path = STATUS_SETTING.exec(section)?.[1] ?? DEFAULT_STATUS
  return path.startsWith('/') ? path : `${root}/${path}`
}

// The text under the heading `heading` matches, up to the next `## ` heading.
const sectionAfter = (text: string, heading: RegExp) => {
  const match = heading.exec(text)
  if (!match) {
    return undefined
  }
  const body = text.slice(match.index + match[0].length)
  const end = body.search(/^## /m)
  return end < 0 ? body : body.slice(0, end)
}

const plain = (text: string) => text.replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim()

// The status file's Next block, as written, or null where there is none.
const readNextBlock = async ($: EngineInterface, statusPath: string) => {
  let status: string
  try {
    status = await $.fs.read(statusPath)
  } catch {
    return null
  }
  return sectionAfter(status, /^## Next[ \t]*$/m) ?? null
}

// The Next block's fields (`- **Run:** …`, continuation lines indented), as
// the relay skills write them; a hint is shown only when a step is queued.
const hintOf = (block: string | null) => {
  if (block === null) {
    return undefined
  }
  const fields: Record<string, string> = {}
  let field: string | undefined
  for (const line of block.split('\n')) {
    const start = /^- \*\*(\w[\w ]*):\*\*(.*)$/.exec(line)
    if (start) {
      const [, name = '', value = ''] = start
      field = name
      fields[field] = value
    } else if (field !== undefined && /^\s+\S/.test(line)) {
      fields[field] += ` ${line}`
    } else {
      field = undefined
    }
  }
  const run = plain(fields.Run ?? '')
  if (run === '' || run === '—' || run === '-') {
    return undefined
  }
  const why = plain(fields.Why ?? '')
  return why === '' ? run : `${run} · ${why}`
}

// The conversation's first turn, or a resumed session's start, takes the Next
// block that a later turn's handoff is measured against.
const begin = async ($: EngineInterface, statusPath: string | undefined) => {
  if (await read($, hasTurn)) {
    return
  }
  const block = statusPath === undefined ? null : await readNextBlock($, statusPath)
  await update($, nextAtStart, () => block)
  await update($, hasTurn, () => true)
}

export const register: Register = on => {
  // AGENTS.md is read once per load. The status file is read at each drawing
  // and each turn's end, so a /clear's redraw shows the step the last
  // conversation queued.
  let statusPath: Promise<string | undefined> | undefined

  // A resumed session starts with turns of its own.
  on('session.start', async ($, e, next) => {
    if ((await $.session.turns()) > 0) {
      await begin($, await (statusPath ??= findStatusPath($)))
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await begin($, await (statusPath ??= findStatusPath($)))
      await update($, handoff, () => null)
    }
    return next(e)
  })

  // A turn that answered and left a queued step in a Next block the
  // conversation did not start with has handed off: offer /clear, after which
  // the go button runs that step in a fresh conversation. An interrupted or
  // failed turn offers nothing, whatever it wrote.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined || e.reason !== 'answer') {
      return result
    }
    const path = await (statusPath ??= findStatusPath($))
    if (path === undefined) {
      return result
    }
    const block = await readNextBlock($, path)
    const hint = block === (await read($, nextAtStart)) ? undefined : hintOf(block)
    await update($, handoff, () => hint ?? null)
    return result
  })

  // A /clear starts a fresh conversation in the same process.
  on('session.end', { reason: 'clear' }, async ($, e, next) => {
    const result = await next(e)
    await update($, hasTurn, () => false)
    await update($, handoff, () => null)
    $.ui.invalidate('ui.render')
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isBusy = e.props.hasSurvey || e.props.isWorking || e.props.view.agentId !== undefined
    if (isBusy) {
      return next(e)
    }
    const queued = (await read($, hasTurn)) ? await read($, handoff) : undefined
    if (queued === null) {
      return next(e)
    }
    const path = await (statusPath ??= findStatusPath($))
    if (path === undefined) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const run = (command: string) => () =>
      $.command.run({ command }).catch((error: unknown) => {
        $.ui.toast(`relay-band: ${error instanceof Error ? error.message : String(error)}`)
      })

    // After a handoff, the band offers the /clear that starts the next
    // conversation, whose band then offers relay:go.
    if (queued !== undefined) {
      return (
        <Box>
          <Text color="claude">⇄ </Text>
          {e.surface === 'terminal' ? (
            <Button key="relay-clear" label="/clear" plain onPress={run('clear')}>
              <Text bold color="inverseText" backgroundColor="claude">
                {' ▶ /clear '}
              </Text>
            </Button>
          ) : (
            <Button key="relay-clear" label="/clear" hotkey="c" variant="primary" onPress={run('clear')} />
          )}
          <Box flexShrink={1}>
            <Text dimColor wrap="truncate-end">{` queued: ${queued}`}</Text>
          </Box>
        </Box>
      )
    }

    const hint = hintOf(await readNextBlock($, path))
    const go = run('relay:go')

    // The terminal's Button chrome pads its label (`[ label ]`); a plain Button
    // holding one filled Text draws a chip instead. It stays one Text: the
    // pointer and the focus invert each child, so parts of different colors
    // would each flip their own way. Other surfaces draw a native button
    // either way, so they keep the label. The mark sits in front, outside the
    // Button, so a hover leaves it alone.
    return (
      <Box>
        <Text color="claude">⇄ </Text>
        {e.surface === 'terminal' ? (
          <Button key="relay-go" label="/relay:go" plain onPress={go}>
            <Text bold color="inverseText" backgroundColor="claude">
              {' ▶ relay:go '}
            </Text>
          </Button>
        ) : (
          <Button key="relay-go" label="/relay:go" hotkey="g" variant="primary" onPress={go} />
        )}
        {hint !== undefined && (
          <Box flexShrink={1}>
            <Text dimColor wrap="truncate-end">{` ${hint}`}</Text>
          </Box>
        )}
      </Box>
    )
  })
}
