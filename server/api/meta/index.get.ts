import { DEPARTMENTS, PAYMENT_METHODS, PERMISSION_GROUPS } from '../../utils/catalog'

export default defineEventHandler(() => ({
  departments: DEPARTMENTS,
  methods: PAYMENT_METHODS,
  permissionGroups: PERMISSION_GROUPS.map((group) => ({ section: group.section, items: group.items.map(([code, label]) => ({ code, label })) }))
}))
