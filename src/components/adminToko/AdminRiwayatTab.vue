<script setup lang="ts">
import { useAdminRiwayatTab } from "../../composables/useAdminRiwayatTab";

const p = useAdminRiwayatTab();
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4"
    >
      <h2 class="text-xl font-bold text-gray-800">Riwayat Pemesanan</h2>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-600">Pilih Tanggal:</label>
        <input
          type="date"
          v-model="p.filterDate.value"
          @change="p.loadRiwayat()"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div class="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <p class="text-indigo-600 font-medium text-sm">Total Transaksi</p>
        <h3 class="text-2xl font-bold text-indigo-900 mt-1">
          {{ p.stats.value.totalTransaksi }}
        </h3>
      </div>
      <div class="bg-green-50 rounded-xl p-4 border border-green-100">
        <p class="text-green-600 font-medium text-sm">
          Total Pendapatan (Selesai)
        </p>
        <h3 class="text-2xl font-bold text-green-900 mt-1">
          Rp {{ p.stats.value.totalPendapatan.toLocaleString("id-ID") }}
        </h3>
      </div>
    </div>

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
                <div class="text-sm text-gray-700">{{ r.meja_nomor }}</div>
                <div class="text-xs text-gray-500 mt-0.5">
                  {{ r.kasir_nama }}
                </div>
              </td>
              <td class="px-6 py-4 text-right font-medium text-gray-800">
                {{ r.total_harga.toLocaleString("id-ID") }}
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'px-2.5 py-1 text-xs font-semibold rounded-full capitalize',
                    p.getStatusBadgeClass(r.status),
                  ]"
                >
                  {{ r.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="text-center p-12">
          <i class="bx bx-history text-5xl text-gray-300 mb-3 block"></i>
          <h3 class="text-gray-500 font-medium">Belum ada transaksi</h3>
          <p class="text-gray-400 text-sm mt-1">
            Tidak ada pemesanan pada tanggal yang dipilih
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
