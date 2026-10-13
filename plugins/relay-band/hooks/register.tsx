import type { EngineInterface, Register } from 'claude-code'

// The heading relay:setup writes into AGENTS.md; every relay skill looks for it.
const RELAY_SECTION = /^## Relay workflow[ \t]*$/m

const isRelayRepo = async ($: EngineInterface) => {
  const root = (await $.session.repo())?.root ?? (await $.session.cwd())
  try {
    return RELAY_SECTION.test(await $.fs.read(`${root}/AGENTS.md`))
  } catch {
    return false
  }
}

export const register: Register = on => {
  // Read once per load: the band only matters before the session's first prompt.
  let isRelay: Promise<boolean> | undefined

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isBusy = e.props.hasSurvey || e.props.isWorking || e.props.view.agentId !== undefined
    if (isBusy || (await $.session.turns()) > 0 || !(await (isRelay ??= isRelayRepo($)))) {
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
