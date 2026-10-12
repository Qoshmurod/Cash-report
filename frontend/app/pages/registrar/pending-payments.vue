<template>
  <AppPage title="To'lov jarayonda">
    <template #actions>
      <UButton
        color="primary"
        icon="i-heroicons-check-circle"
        :loading="closing"
        :disabled="pendingPayments.length === 0"
        @click="handleCloseShift"
      >
        Kunni yopish
      </UButton>
    </template>

    <div class="space-y-4">
      <!-- Bugungi kutilayotgan to'lovlar kartasi -->
      <UCard class="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 font-medium">
          <div>
            <span class="text-gray-500">Kutilayotgan to'lovlar soni:</span>
            <span class="ml-2 font-bold text-lg">{{ pendingData.count || 0 }}</span>
          </div>
          <div>
            <span class="text-gray-500">Kutilayotgan summa:</span>
            <span class="ml-2 font-bold text-lg text-amber-600">
              {{ formatMoney(pendingData.totalAmount || 0) }}
            </span>
          </div>
          <div>
            <span class="text-gray-500">Kassir:</span>
            <span class="ml-2 font-bold">{{ user?.fullName || 'Kassir' }}</span>
          </div>
        </div>
      </UCard>

      <!-- To'lovlar jadvali -->
      <UTable
        v-model="selectedPayments"
        :rows="pendingPayments"
        :columns="columns"
      >
        <template #patient-data="{ row }">
          {{ row.patient?.fullName || 'Noma'lum' }}
        </template>
        <template #totalAmount-data="{ row }">
          {{ formatMoney(row.totalAmount) }}
        </template>
      </UTable>

      <div v-if="pendingPayments.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-check-badge" class="w-16 h-16 text-emerald-500 mx-auto" />
        <p class="mt-2 text-gray-500">Kutilayotgan to'lovlar yo'q</p>
      </div>
    </div>
  </AppPage>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const api = useApi();
const authStore = useAuthStore();
const user = authStore?.user;

const pendingData = ref({ payments: [], count: 0, totalAmount: 0 });
const selectedPayments = ref([]);
const closing = ref(false);

const columns = [
  { key: 'createdAt', label: 'SANA' },
  { key: 'patient', label: 'MIJOZ' },
  { key: 'paymentMethod', label: 'TO'LOV TURI' },
  { key: 'totalAmount', label: 'JAMI' },
];

const pendingPayments = computed(() => pendingData.value.payments || []);

const formatMoney = (val) => {
  return new Intl.NumberFormat('uz-UZ').format(val || 0) + ' so'm';
};

const fetchPending = async () => {
  try {
    const res = await api.get('/payments/pending-shift');
    pendingData.value = res || { payments: [], count: 0, totalAmount: 0 };
  } catch (err) {
    console.error(err);
  }
};

const handleCloseShift = async () => {
  if (!confirm('Tanlangan to'lovlarni umumiy hisobotga o'tkazib, kunni yopasizmi?')) return;
  closing.value = true;
  try {
    const selectedIds = selectedPayments.value.map((p) => p.id);
    await api.post('/payments/close-shift', {
      paymentIds: selectedIds.length ? selectedIds : undefined,
    });
    await fetchPending();
    selectedPayments.value = [];
  } catch (err) {
    console.error(err);
  } finally {
    closing.value = false;
  }
};

onMounted(fetchPending);
</script>
