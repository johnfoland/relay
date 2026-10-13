import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const ROOT = '/work/app'

const props = (isWorking = false) => ({
  hasSurvey: false,
  isWorking,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 9 },
  view: {},
})

// Stands in for the engine beneath the plugin: its own band, the session's
// prompt count, its repository, and the files in it.
const session = (on: On, { turns = 0, files = {} as Record<string, string> } = {}) => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box key="engine" />
  })
  on('session.turns', () => ({ value: turns }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('session.repo', () => ({ value: { root: ROOT, remote: null, internal: false, name: null } }))
  on('fs.read', (_$, e) => {
    const text = files[e.path]
    if (text === undefined) {
      throw new Error(`ENOENT: ${e.path}`)
    }
    return { value: text }
  })
}

const RELAY_AGENTS = '# app\n\n## Commands\n\n- make check\n\n## Relay workflow\n\n- Gate: make check\n'

for (const surface of ['terminal', 'desktop'] as const) {
  const mount = ($: Engine, isWorking = false) =>
    $.ui.mount({ plugin: 'relay-band', surface, component: 'AbovePrompt', props: props(isWorking) })

  test(`${surface}: a fresh session in a relay repo shows the button, and pressing it runs relay:go`, async ($, on) => {
    const ran: string[] = []
    session(on, { files: { [`${ROOT}/AGENTS.md`]: RELAY_AGENTS } })
    on('command.run', (_$, e) => {
      ran.push(e.command)
      return {}
    })

    const ui = await mount($)
    expect(await ui.find({ type: 'Button', key: 'relay-go' })).toBeDefined()

    await ui.press({ key: 'relay-go' })
    expect(ran).toEqual(['relay:go'])
  })

  test(`${surface}: hidden once a turn starts`, async ($, on) => {
    session(on, { files: { [`${ROOT}/AGENTS.md`]: RELAY_AGENTS } })

    const ui = await mount($)
    await $.turn.start({ text: 'hi', turnId: 't1' })
    expect(await ui.find({ type: 'Button', key: 'relay-go' })).toBeUndefined()
  })

  test(`${surface}: hidden in a resumed session`, async ($, on) => {
    session(on, { turns: 3, files: { [`${ROOT}/AGENTS.md`]: RELAY_AGENTS } })

    await $.session.start({ cwd: ROOT, surface, isInteractive: true })
    expect(await (await mount($)).find({ type: 'Button', key: 'relay-go' })).toBeUndefined()
  })

  test(`${surface}: back after a /clear`, async ($, on) => {
    session(on, { files: { [`${ROOT}/AGENTS.md`]: RELAY_AGENTS } })

    const ui = await mount($)
    await $.turn.start({ text: 'hi', turnId: 't1' })
    await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
    expect(await ui.find({ type: 'Button', key: 'relay-go' })).toBeDefined()
  })

  test(`${surface}: stays hidden after an end that is not a /clear`, async ($, on) => {
    session(on, { files: { [`${ROOT}/AGENTS.md`]: RELAY_AGENTS } })

    const ui = await mount($)
    await $.turn.start({ text: 'hi', turnId: 't1' })
    await $.session.end({ reason: 'resume', sessionId: 's1', resume: { id: 's1' } })
    expect(await ui.find({ type: 'Button', key: 'relay-go' })).toBeUndefined()
  })

  test(`${surface}: hidden while a turn runs`, async ($, on) => {
    session(on, { files: { [`${ROOT}/AGENTS.md`]: RELAY_AGENTS } })

    expect(await (await mount($, true)).find({ type: 'Button', key: 'relay-go' })).toBeUndefined()
  })

  test(`${surface}: hidden where AGENTS.md has no Relay workflow section`, async ($, on) => {
    session(on, { files: { [`${ROOT}/AGENTS.md`]: '# app\n\nSee the *Relay workflow* notes elsewhere.\n' } })

    expect(await (await mount($)).find({ type: 'Button', key: 'relay-go' })).toBeUndefined()
  })

  test(`${surface}: hidden where the repository has no AGENTS.md`, async ($, on) => {
    session(on)

    expect(await (await mount($)).find({ type: 'Button', key: 'relay-go' })).toBeUndefined()
  })
}
