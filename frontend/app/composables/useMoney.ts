const GROUP_REGEX = /\B(?=(\d{3})+(?!\d))/g

export function formatAmount(value: number | string | null | undefined): string {
  const n = Math.round(Number(value ?? 0))
  if (!Number.isFinite(n)) return '0'
  const sign = n < 0 ? '-' : ''
  return sign + String(Math.abs(n)).replace(GROUP_REGEX, ' ')
}

export function useMoney() {
  const settings = useSettingsStore()
  const format = (value: number | string | null | undefined, withCurrency = true) =>
    withCurrency ? `${formatAmount(value)} ${settings.currency}` : formatAmount(value)
  return { format, formatAmount, currency: computed(() => settings.currency) }
}
