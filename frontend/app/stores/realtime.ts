import { defineStore } from 'pinia'
import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents } from '~/types/api'

export type RealtimeSocket = Socket<ServerToClientEvents>

export const useRealtimeStore = defineStore('realtime', () => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const connected = ref(false)
  const socket = shallowRef<RealtimeSocket | null>(null)

  function connect() {
    if (socket.value) return socket.value
    const s: RealtimeSocket = io(`${config.public.wsUrl}/realtime`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      // evaluated on every (re)connect so rotated tokens are picked up
      auth: (cb) => cb(auth.accessToken ? { token: auth.accessToken } : {}),
    })
    s.on('connect', () => {
      connected.value = true
    })
    s.on('disconnect', () => {
      connected.value = false
    })
    s.on('connect_error', () => {
      connected.value = false
    })
    socket.value = s
    return s
  }

  function reconnect() {
    if (!socket.value) return connect()
    socket.value.disconnect()
    socket.value.connect()
    return socket.value
  }

  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    connected.value = false
  }

  // Re-authenticate the socket when the user logs in/out (rooms depend on the token)
  watch(
    () => auth.user?.id ?? null,
    (next, prev) => {
      if (next !== prev && socket.value) reconnect()
    },
  )

  return { connected, socket, connect, reconnect, disconnect }
})
