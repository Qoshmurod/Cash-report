import type { QueryParams } from './useApi'

/** Binary downloads (Excel / PDF exports, receipt PDF) with auth + refresh handling. */
export function useApiDownload() {
  const api = useApi()
  const downloading = ref(false)

  async function run(fn: () => Promise<void>) {
    downloading.value = true
    try {
      await fn()
    } finally {
      downloading.value = false
    }
  }

  return {
    downloading,
    download: (path: string, query?: QueryParams, fallbackName?: string) => run(() => api.download(path, query, fallbackName)),
    open: (path: string, query?: QueryParams) => run(() => api.openBlob(path, query)),
  }
}
