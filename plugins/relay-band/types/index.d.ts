export type HasTurn = boolean

declare module 'claude-code' {
  interface PluginState {
    'relay-band': { hasTurn: HasTurn }
  }
}
