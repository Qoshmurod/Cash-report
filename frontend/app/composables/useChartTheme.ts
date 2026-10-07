import type { PaymentMethod } from '~/types/api'

export const METHOD_COLORS: Record<PaymentMethod, string> = {
  CASH: '#14b8a6',
  CARD: '#0ea5e9',
  CONTRACT: '#8b5cf6',
}
export const SERIES_COLORS = ['#14b8a6', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e', '#10b981', '#6366f1', '#ec4899']

/** Axis / tooltip colours that follow the current light/dark mode. */
export function useChartTheme() {
  const colorMode = useColorMode()
  const { formatAmount } = useMoney()
  const dark = computed(() => colorMode.value === 'dark')

  const base = computed(() => ({
    text: dark.value ? '#cbd5e1' : '#475569',
    muted: dark.value ? '#64748b' : '#94a3b8',
    grid: dark.value ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.14)',
    tooltipBg: dark.value ? '#0f172a' : '#ffffff',
    tooltipBorder: dark.value ? '#1e293b' : '#e2e8f0',
  }))

  const tooltip = computed(() => ({
    backgroundColor: base.value.tooltipBg,
    borderColor: base.value.tooltipBorder,
    textStyle: { color: base.value.text, fontFamily: 'Inter, sans-serif' },
    extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12);',
  }))

  const axis = computed(() => ({
    axisLine: { lineStyle: { color: base.value.grid } },
    axisTick: { show: false },
    axisLabel: { color: base.value.muted, fontFamily: 'Inter, sans-serif' },
    splitLine: { lineStyle: { color: base.value.grid } },
  }))

  /** Compact money axis labels: 1.2M, 350K */
  const compact = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v))

  return { dark, base, tooltip, axis, compact, formatAmount }
}
