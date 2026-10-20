import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { HasTurn } from '../types'

// The heading relay:setup writes into AGENTS.md; every relay skill looks for it.
const RELAY_SECTION = /^## Relay workflow[ \t]*$/m

// Whether the conversation has had a model turn. Kept in session state, not
// $.session.turns(), because a /clear fires no session.start and the band's
// drawing is cached: only a state write (or an invalidate) redraws it.
const hasTurn = atom({ plugin: 'relay-band', key: 'hasTurn' } as const, false as HasTurn)

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

// The Next block's fields (`- **Run:** …`, continuation lines indented), as
// the relay skills write them; a hint is shown only when a step is queued.
const readNext = async ($: EngineInterface, statusPath: string) => {
  let status: string
  try {
    status = await $.fs.read(statusPath)
  } catch {
    return undefined
  }
  const block = sectionAfter(status, /^## Next[ \t]*$/m)
  if (block === undefined) {
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

export const register: Register = on => {
  // AGENTS.md is read once per load: the band only matters before the
  // conversation's first turn. The status file is read at each drawing, so a
  // /clear's redraw shows the step the last conversation queued.
  let statusPath: Promise<string | undefined> | undefined

  // A resumed session starts with turns of its own.
  on('session.start', async ($, e, next) => {
    if ((await $.session.turns()) > 0) {
      await update($, hasTurn, () => true)
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, hasTurn, () => true)
    return next(e)
  })

  // A /clear starts a fresh conversation in the same process.
  on('session.end', { reason: 'clear' }, async ($, e, next) => {
    const result = await next(e)
    await update($, hasTurn, () => false)
    $.ui.invalidate('ui.render')
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isBusy = e.props.hasSurvey || e.props.isWorking || e.props.view.agentId !== undefined
    if (isBusy || (await read($, hasTurn))) {
      return next(e)
    }
    const path = await (statusPath ??= findStatusPath($))
    if (path === undefined) {
      return next(e)
    }
    const hint = await readNext($, path)

    const { Box, Button, Text } = $.ui.resolve(e)
    const go = () =>
      $.command.run({ command: 'relay:go' }).catch((error: unknown) => {
        $.ui.toast(`relay-band: ${error instanceof Error ? error.message : String(error)}`)
      })

    // The terminal's Button chrome pads its label (`[ label ]`); a plain Button
    // holding filled Texts draws a split pill instead: the mark and name on a
    // muted half, the action on the accent. Other surfaces draw a native
    // button either way, so they keep the label and take the mark beside it.
    return (
      <Box>
        {e.surface === 'terminal' ? (
          <Button key="relay-go" label="/relay:go" plain onPress={go}>
            <Text color="claude" backgroundColor="subtle">{' ⇄'}</Text>
            <Text color="text" backgroundColor="subtle">{' relay '}</Text>
            <Text bold color="inverseText" backgroundColor="claude">{' ▶ go '}</Text>
          </Button>
        ) : (
          <>
            <Text color="claude">⇄ </Text>
            <Button key="relay-go" label="/relay:go" hotkey="g" variant="primary" onPress={go} />
          </>
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
