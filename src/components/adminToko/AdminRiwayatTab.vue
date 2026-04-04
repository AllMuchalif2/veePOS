<script setup lang="ts">
import { useAdminRiwayatTab } from "../../composables/useAdminRiwayatTab";
import OrderDetailModal from "../shared/OrderDetailModal.vue";
import { usePosStore } from "../../stores/posStore";
import { useAuthStore } from "../../stores/authStore";
import { useExportExcel } from "../../composables/useExportExcel";
import { ref, onMounted } from "vue";

const p = useAdminRiwayatTab();
const posStore = usePosStore();
const authStore = useAuthStore();
const { exportToExcel } = useExportExcel();

const exporting = ref(false);

const handleExport = async () => {
  const tokoId = authStore.profile?.id_toko;
  if (!tokoId) return;

  exporting.value = true;
  await exportToExcel(tokoId, {
    mode: p.filterMode.value,
    date: p.filterDate.value,
    month: p.filterMonth.value,
    year: p.filterYear.value,
  });
  exporting.value = false;
};

onMounted(() => {
  posStore.fetchMenu();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Filter Section -->
    <div
      class="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
        <!-- Filter Mode -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Mode Filter</label>
          <select 
            v-model="p.filterMode.value" 
            @change="p.loadRiwayat()"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-gray-50/50"
          >
            <option value="day">Harian</option>
            <option value="month">Bulanan</option>
            <option value="year">Tahunan</option>
            <option value="all">Semua Data</option>
          </select>
        </div>

        <!-- Date Input (Day Mode) -->
        <div v-if="p.filterMode.value === 'day'" class="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Tanggal</label>
          <input
            type="date"
            v-model="p.filterDate.value"
            @change="p.loadRiwayat()"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-gray-50/50"
          />
        </div>

        <!-- Month Input (Month Mode) -->
        <div v-if="p.filterMode.value === 'month'" class="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Bulan</label>
          <input
            type="month"
            v-model="p.filterMonth.value"
            @change="p.loadRiwayat()"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-gray-50/50"
          />
        </div>

        <!-- Year Input (Year Mode) -->
        <div v-if="p.filterMode.value === 'year'" class="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Tahun</label>
          <select
            v-model="p.filterYear.value"
            @change="p.loadRiwayat()"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-gray-50/50"
          >
            <option v-for="y in [2023, 2024, 2025, 2026]" :key="y" :value="y.toString()">{{ y }}</option>
          </select>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          @click="p.loadRiwayat()"
          class="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:text-primary transition-all active:scale-95"
          title="Refresh Data"
        >
          <i class="bx bx-refresh text-xl"></i>
        </button>
        <button
          @click="handleExport"
          :disabled="exporting || p.riwayat.value.length === 0"
          class="flex items-center gap-2 px-4 py-2.5 bg-success text-white rounded-xl font-bold hover:bg-success/90 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
        >
          <i v-if="exporting" class="bx bx-loader-alt bx-spin"></i>
          <i v-else class="bx bx-spreadsheet text-lg"></i>
          <span>Ekspor Excel</span>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div class="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <p class="text-indigo-600 font-medium text-sm">Total Transaksi</p>
        <h3 class="text-2xl font-bold text-indigo-900 mt-1">
          {{ p.stats.value.totalTransaksi }}
        </h3>
      </div>
      <div class="bg-success/10 rounded-xl p-4 border border-success/20">
        <p class="text-success font-medium text-sm">
          Total Pendapatan (Selesai)
        </p>
        <h3 class="text-2xl font-bold text-gray-800 mt-1">
          Rp {{ p.stats.value.totalPendapatan.toLocaleString("id-ID") }}
        </h3>
      </div>
    </div>

    <!-- Table -->
    <div v-if="p.loading.value" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left" v-if="p.riwayat.value.length > 0">
          <thead
            class="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700"
          >
            <tr>
              <th class="px-6 py-4">Waktu</th>
              <th class="px-6 py-4">Pesanan / Pelanggan</th>
              <th class="px-6 py-4">Tipe Pemesanan</th>
              <th class="px-6 py-4 text-right">Total (Rp)</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="r in p.riwayat.value"
              :key="r.id"
              class="hover:bg-gray-50 transition"
            >
              <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                {{
                  new Date(r.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">
                  {{ r.nomor_pesanan || "-" }}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  {{ r.nama_pelanggan }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-700">{{ r.meja?.nomor_meja || '-' }}</div>
                <div class="text-xs text-gray-500 mt-0.5">
                  {{ r.kasir?.nama || '-' }}
                </div>
              </td>
              <td class="px-6 py-4 text-right font-medium text-gray-800">
                {{ r.total_harga.toLocaleString("id-ID") }}
              </td>
              <td class="px-6 py-4">
                <select
                  :value="r.status"
                  @change="
                    p.updateStatus(
                      r.id,
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                  :class="[
                    'text-xs font-semibold rounded-full px-3 py-1 border-0 outline-none cursor-pointer transition',
                    p.getStatusBadgeClass(r.status),
                  ]"
                >
                  <option v-for="s in p.statusOptions" :key="s" :value="s">
                    {{ s }}
                  </option>
                </select>
              </td>
              <td class="px-6 py-4 text-center">
                <button
                  @click="p.openDetail(r)"
                  class="p-2 text-slate-400 hover:text-primary transition rounded-lg hover:bg-slate-100"
                  title="Lihat Detail / Edit Item"
                >
                  <i class="bx bx-show text-xl"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="text-center p-12">
          <i class="bx bx-history text-5xl text-gray-300 mb-3 block"></i>
          <h3 class="text-gray-500 font-medium">Belum ada transaksi</h3>
          <p class="text-gray-400 text-sm mt-1">
            Tidak ada pemesanan pada kriteria filter yang dipilih
          </p>
        </div>
      </div>
    </div>

    <!-- Detail Modal (Shared) -->
    <OrderDetailModal
      :show="p.showDetailModal.value"
      :pesanan="p.selectedPesanan.value"
      @close="p.showDetailModal.value = false"
      @updated="p.handleUpdate"
    />
  </div>
</template>
