import type { ServerToClientEvents } from '~/types/api'

/**
 * Subscribe to realtime events; handlers are removed automatically when the
 * calling component / effect scope is disposed.
 */
export function useRealtime() {
  const store = useRealtimeStore()
  const socket = store.connect()

  function on<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) {
    // socket.io's typed emitter needs the listener cast to its internal parameter type
    const listener = handler as Parameters<typeof socket.on<E>>[1]
    socket.on(event, listener)
    onScopeDispose(() => {
      socket.off(event, listener)
    })
  }

  function onReconnect(handler: () => void) {
    socket.io.on('reconnect', handler)
    onScopeDispose(() => {
      socket.io.off('reconnect', handler)
    })
  }

  return { connected: computed(() => store.connected), on, onReconnect }
}
