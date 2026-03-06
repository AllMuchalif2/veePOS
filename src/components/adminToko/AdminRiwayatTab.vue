<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../supabaseClient";

interface DetailPesanan {
  id: string;
  id_produk: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  produk: {
    nama: string;
  };
}

interface Pesanan {
  id: string;
  nomor_pesanan: string | null;
  nama_pelanggan: string;
  status: string;
  total_harga: number;
  metode_pembayaran: string | null;
  created_at: string;
  kasir_nama: string | null;
  meja_nomor: string | null;
  detail_pesanan: DetailPesanan[];
}

const riwayat = ref<Pesanan[]>([]);
const loading = ref(true);
const filterDate = ref(new Date().toISOString().split("T")[0]); // Default hari ini
const stats = ref({ totalTransaksi: 0, totalPendapatan: 0 });

const loadRiwayat = async () => {
  loading.value = true;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id_toko")
      .eq("id", userData.user?.id)
      .single();

    if (!profile?.id_toko) return;

    // Filter by selected date
    const startOfDay = new Date(filterDate.value);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(filterDate.value);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("pesanan")
      .select(
        `
        id,
        nomor_pesanan,
        nama_pelanggan,
        status,
        total_harga,
        metode_pembayaran,
        created_at,
        id_kasir,
        id_meja
      `,
      )
      .eq("id_toko", profile.id_toko)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    // We also need to fetch related names manually since we don't have explicit joins set up for all in the database yet
    // To keep it simple, we'll fetch details later when clicking a row, or fetch them all if needed

    let totalRp = 0;

    // Map data
    const mapped = data.map((p: any) => {
      if (p.status === "selesai") {
        totalRp += p.total_harga;
      }
      return {
        ...p,
        kasir_nama: p.id_kasir ? "Kasir" : "Self-Order", // simplified
        meja_nomor: p.id_meja ? "Meja" : "Takeaway",
        detail_pesanan: [],
      };
    });

    riwayat.value = mapped;
    stats.value = {
      totalTransaksi: mapped.length,
      totalPendapatan: totalRp,
    };
  } catch (error) {
    console.error("Error loading riwayat", error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadRiwayat();
});

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "selesai":
      return "bg-green-100 text-green-700";
    case "batal":
      return "bg-red-100 text-red-700";
    case "menunggu":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};
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
          v-model="filterDate"
          @change="loadRiwayat"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div class="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <p class="text-indigo-600 font-medium text-sm">Total Transaksi</p>
        <h3 class="text-2xl font-bold text-indigo-900 mt-1">
          {{ stats.totalTransaksi }}
        </h3>
      </div>
      <div class="bg-green-50 rounded-xl p-4 border border-green-100">
        <p class="text-green-600 font-medium text-sm">
          Total Pendapatan (Selesai)
        </p>
        <h3 class="text-2xl font-bold text-green-900 mt-1">
          Rp {{ stats.totalPendapatan.toLocaleString("id-ID") }}
        </h3>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left" v-if="riwayat.length > 0">
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
              v-for="r in riwayat"
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
                    getStatusBadgeClass(r.status),
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
