import { h } from 'vue'
import SortHeader from '~/components/common/SortHeader.vue'
import type { SortOrder } from '~/types/api'

interface Sortable {
  sortBy: Ref<string>
  sortOrder: Ref<SortOrder>
  setSort: (column: string) => void
}

/** Header renderer for server-side sortable table columns. */
export function useSortHeader(list: Sortable) {
  return (label: string, column: string) => () =>
    h(SortHeader, { label, column, sortBy: list.sortBy.value, sortOrder: list.sortOrder.value, onSort: list.setSort })
}
