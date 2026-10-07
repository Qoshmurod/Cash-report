import type { EChartsCoreOption } from 'echarts/core'
import type { DepartmentStat, DoctorStat, PaymentMethod, RevenuePoint, ServiceStat } from '~/types/api'
import { METHOD_COLORS, SERIES_COLORS } from './useChartTheme'

/** ECharts option builders shared by the dashboard and the reports page. */
export function useReportCharts() {
  const { t } = useI18n()
  const labels = useLabels()
  const theme = useChartTheme()
  const { format } = useMoney()

  const moneyTooltip = (params: unknown) => {
    const list = (Array.isArray(params) ? params : [params]) as { axisValueLabel?: string; name?: string; marker: string; seriesName: string; value: number }[]
    const head = list[0]?.axisValueLabel ?? list[0]?.name ?? ''
    const rows = list.map((p) => `${p.marker} ${p.seriesName}: <b>${format(p.value)}</b>`).join('<br/>')
    return `${head}<br/>${rows}`
  }

  function revenue(points: RevenuePoint[], periodLabel: (p: string) => string = (p) => p): EChartsCoreOption {
    const methods: PaymentMethod[] = ['CASH', 'CARD', 'CONTRACT']
    const key = { CASH: 'cash', CARD: 'card', CONTRACT: 'contract' } as const
    return {
      color: methods.map((m) => METHOD_COLORS[m]),
      tooltip: { ...theme.tooltip.value, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: moneyTooltip },
      legend: { top: 0, right: 0, textStyle: { color: theme.base.value.text }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
      grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: points.map((p) => periodLabel(p.period)), ...theme.axis.value, splitLine: { show: false } },
      yAxis: { type: 'value', ...theme.axis.value, axisLabel: { ...theme.axis.value.axisLabel, formatter: theme.compact } },
      series: methods.map((m) => ({
        name: labels.paymentMethod(m),
        type: 'bar',
        stack: 'total',
        barMaxWidth: 28,
        itemStyle: { borderRadius: m === 'CONTRACT' ? [4, 4, 0, 0] : 0 },
        emphasis: { focus: 'series' },
        data: points.map((p) => p[key[m]]),
      })),
    }
  }

  function methods(data: { method: PaymentMethod; amount: number; count: number }[]): EChartsCoreOption {
    return {
      tooltip: { ...theme.tooltip.value, trigger: 'item', formatter: (p: { name: string; value: number; percent: number; marker: string }) => `${p.marker} ${p.name}<br/><b>${format(p.value)}</b> (${p.percent}%)` },
      legend: { bottom: 0, textStyle: { color: theme.base.value.text }, icon: 'circle' },
      series: [
        {
          type: 'pie',
          radius: ['55%', '80%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: theme.dark.value ? '#0f172a' : '#fff', borderWidth: 3, borderRadius: 6 },
          label: { show: false },
          data: data.map((d) => ({ name: labels.paymentMethod(d.method), value: d.amount, itemStyle: { color: METHOD_COLORS[d.method] } })),
        },
      ],
    }
  }

  function horizontalBar(items: { name: string; value: number }[], seriesName: string, money = false, color = SERIES_COLORS[0]): EChartsCoreOption {
    const rows = [...items].reverse()
    return {
      tooltip: {
        ...theme.tooltip.value,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: money ? moneyTooltip : undefined,
      },
      grid: { left: 8, right: 24, top: 8, bottom: 4, containLabel: true },
      xAxis: { type: 'value', ...theme.axis.value, axisLabel: { ...theme.axis.value.axisLabel, formatter: money ? theme.compact : undefined } },
      yAxis: {
        type: 'category',
        data: rows.map((r) => r.name),
        ...theme.axis.value,
        axisLabel: { ...theme.axis.value.axisLabel, width: 140, overflow: 'truncate' },
        splitLine: { show: false },
      },
      series: [{ name: seriesName, type: 'bar', barMaxWidth: 18, itemStyle: { color, borderRadius: [0, 4, 4, 0] }, data: rows.map((r) => r.value) }],
    }
  }

  const topServices = (s: ServiceStat[]) => horizontalBar(s.slice(0, 10).map((x) => ({ name: x.name, value: x.count })), t('reports.count'))
  const doctors = (d: DoctorStat[]) =>
    horizontalBar(d.slice(0, 10).map((x) => ({ name: x.name, value: x.servicesCount })), t('reports.servicesCount'), false, SERIES_COLORS[1])
  const departments = (d: DepartmentStat[]): EChartsCoreOption => ({
    tooltip: { ...theme.tooltip.value, trigger: 'item', formatter: (p: { name: string; value: number; percent: number; marker: string }) => `${p.marker} ${p.name}<br/><b>${format(p.value)}</b> (${p.percent}%)` },
    legend: { type: 'scroll', bottom: 0, textStyle: { color: theme.base.value.text }, icon: 'circle' },
    color: SERIES_COLORS,
    series: [
      {
        type: 'pie',
        radius: ['30%', '75%'],
        center: ['50%', '45%'],
        roseType: 'radius',
        itemStyle: { borderRadius: 6, borderColor: theme.dark.value ? '#0f172a' : '#fff', borderWidth: 2 },
        label: { show: false },
        data: d.map((x) => ({ name: x.name, value: x.amount })),
      },
    ],
  })

  return { revenue, methods, horizontalBar, topServices, doctors, departments }
}
