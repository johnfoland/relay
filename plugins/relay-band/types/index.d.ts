export type HasTurn = boolean
// The status file's Next block as the conversation's first turn found it.
export type NextAtStart = string | null
// The step a successful turn queued, shown beside the /clear button.
export type Handoff = string | null

declare module 'claude-code' {
  interface PluginState {
    'relay-band': { hasTurn: HasTurn; nextAtStart: NextAtStart; handoff: Handoff }
  }
}
