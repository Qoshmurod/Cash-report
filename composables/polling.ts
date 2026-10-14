// Periodic refresh that pauses while the browser tab is hidden, so idle tabs cause no server load.
export function usePolling(fn: () => unknown, intervalMs: number) {
  let timer: ReturnType<typeof setInterval> | undefined
  const start = () => {
    stop()
    timer = setInterval(() => { if (document.visibilityState === 'visible') fn() }, intervalMs)
  }
  const stop = () => { if (timer) clearInterval(timer); timer = undefined }
  const onVisible = () => { if (document.visibilityState === 'visible') fn() }
  onMounted(() => { start(); document.addEventListener('visibilitychange', onVisible) })
  onUnmounted(() => { stop(); document.removeEventListener('visibilitychange', onVisible) })
}
