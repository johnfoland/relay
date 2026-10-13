import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { HasTurn } from '../types'

// The heading relay:setup writes into AGENTS.md; every relay skill looks for it.
const RELAY_SECTION = /^## Relay workflow[ \t]*$/m

// Whether the conversation has had a model turn. Kept in session state, not
// $.session.turns(), because a /clear fires no session.start and the band's
// drawing is cached: only a state write (or an invalidate) redraws it.
const hasTurn = atom({ plugin: 'relay-band', key: 'hasTurn' } as const, false as HasTurn)

const isRelayRepo = async ($: EngineInterface) => {
  const root = (await $.session.repo())?.root ?? (await $.session.cwd())
  try {
    return RELAY_SECTION.test(await $.fs.read(`${root}/AGENTS.md`))
  } catch {
    return false
  }
}

export const register: Register = on => {
  // Read once per load: the band only matters before the conversation's first turn.
  let isRelay: Promise<boolean> | undefined

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
    if (isBusy || (await read($, hasTurn)) || !(await (isRelay ??= isRelayRepo($)))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const go = () =>
      $.command.run({ command: 'relay:go' }).catch((error: unknown) => {
        $.ui.toast(`relay-band: ${error instanceof Error ? error.message : String(error)}`)
      })

    return (
      <Box>
        <Text dimColor>Relay workflow </Text>
        <Button key="relay-go" label="/relay:go" hotkey="g" variant="primary" onPress={go} />
      </Box>
    )
  })
}
