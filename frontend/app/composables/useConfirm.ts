import ConfirmModal from '~/components/common/ConfirmModal.vue'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  color?: 'primary' | 'error' | 'warning' | 'success' | 'neutral'
  icon?: string
  /** When set, a required text input (e.g. reason) is shown and its value returned. */
  inputLabel?: string
  inputRequired?: boolean
}

export type ConfirmResult = { confirmed: false } | { confirmed: true; value: string }

/** Promise based confirmation dialog: `const r = await confirm({...}); if (r.confirmed) ...` */
export function useConfirm() {
  const overlay = useOverlay()
  const modal = overlay.create(ConfirmModal)

  async function confirm(options: ConfirmOptions): Promise<ConfirmResult> {
    const instance = modal.open(options)
    const result = await instance.result
    return result ?? { confirmed: false }
  }

  return { confirm }
}
