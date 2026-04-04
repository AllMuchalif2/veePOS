<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../supabaseClient";
import { swalError } from "../../composables/useSwal";
import { useAuthStore } from "../../stores/authStore";
import { usePosStore } from "../../stores/posStore";
import { useExportExcel } from "../../composables/useExportExcel";
import OrderDetailModal from "../shared/OrderDetailModal.vue";

const posStore = usePosStore();
const authStore = useAuthStore();
const { exportToExcel } = useExportExcel();

const exporting = ref(false);

const handleExport = async () => {
  const tokoId = authStore.profile?.id_toko;
  if (!tokoId) return;

  exporting.value = true;
  // For cashier, we export specifically for today
  await exportToExcel(tokoId, {
    mode: "day",
    date: new Date().toISOString().split("T")[0],
  });
  exporting.value = false;
};

interface Pesanan {
  id: string;
  nomor_pesanan: string | null;
  nama_pelanggan: string;
  status: string;
  total_harga: number;
  tipe_pesanan: string;
  created_at: string;
}

const pesananList = ref<Pesanan[]>([]);
const loading = ref(true);
const filterStatus = ref("pending");

// Detail Modal State
const showDetailModal = ref(false);
const selectedPesanan = ref<Pesanan | null>(null);

const statusOptions = [
  {
    value: "pending",
    label: "Menunggu Bayar",
    color: "bg-warning/20 text-warning",
  },
  { value: "diproses", label: "Diproses", color: "bg-info/20 text-info" },
  {
    value: "selesai",
    label: "Selesai",
    color: "bg-success/20 text-success",
  },
  { value: "dibatalkan", label: "Batal", color: "bg-danger/20 text-danger" },
];

const getColor = (status: string) =>
  statusOptions.find((s) => s.value === status)?.color ??
  "bg-gray-100 text-gray-700";
const getLabel = (status: string) =>
  statusOptions.find((s) => s.value === status)?.label ?? status;

const loadPesanan = async () => {
  loading.value = true;
  try {
    const tokoId = authStore.profile?.id_toko;
    if (!tokoId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = supabase
      .from("pesanan")
      .select(
        "id, nomor_pesanan, nama_pelanggan, status, total_harga, tipe_pesanan, created_at",
      )
      .eq("id_toko", tokoId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    if (filterStatus.value !== "semua") {
      query.eq("status", filterStatus.value);
    }

    const { data, error } = await query;
    if (error) throw error;
    pesananList.value = data || [];
  } catch (err: any) {
    await swalError("Gagal memuat pesanan", err.message);
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (id: string, newStatus: string) => {
  try {
    const { error } = await supabase
      .from("pesanan")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) throw error;
    const item = pesananList.value.find((p) => p.id === id);
    if (item) item.status = newStatus;
  } catch (err: any) {
    await swalError("Gagal mengubah status", err.message);
  }
};

const openDetail = (p: Pesanan) => {
  selectedPesanan.value = p;
  showDetailModal.value = true;
};

const handleUpdate = () => {
  loadPesanan();
  if (selectedPesanan.value) {
    selectedPesanan.value = pesananList.value.find(p => p.id === selectedPesanan.value?.id) || null;
  }
};

onMounted(async () => {
  await loadPesanan();
  await posStore.fetchMenu();
});
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <h2 class="text-lg font-bold text-slate-800">Pesanan Hari Ini</h2>
      <div class="flex items-center gap-2">
        <!-- Filter tabs -->
        <div class="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            v-for="s in [{ value: 'semua', label: 'Semua' }, ...statusOptions]"
            :key="s.value"
            @click="
              filterStatus = s.value;
              loadPesanan();
            "
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition',
              filterStatus === s.value
                ? 'bg-white shadow text-slate-800'
                : 'text-slate-500 hover:text-slate-700',
            ]"
          >
            {{ s.label }}
          </button>
        </div>
        <button
          @click="loadPesanan()"
          class="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary transition"
          title="Refresh"
        >
          <i class="bx bx-refresh text-lg leading-none"></i>
        </button>
        <button
          @click="handleExport"
          :disabled="exporting || pesananList.length === 0"
          class="flex items-center gap-2 px-3 py-2 bg-success text-white rounded-xl text-xs font-bold hover:bg-success/90 transition-all active:scale-95 disabled:opacity-50"
        >
          <i v-if="exporting" class="bx bx-loader-alt bx-spin"></i>
          <i v-else class="bx bx-spreadsheet"></i>
          <span>Ekspor</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <!-- Empty -->
    <div
      v-else-if="pesananList.length === 0"
      class="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-100"
    >
      <i class="bx bx-receipt text-5xl mb-3 block"></i>
      <p class="font-medium">Tidak ada pesanan</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div
        v-for="p in pesananList"
        :key="p.id"
        :class="[
          'bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition',
          p.status === 'pending' ? 'border-warning/40' : 'border-slate-100',
        ]"
      >
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-slate-800 text-sm">{{
              p.nomor_pesanan || "-"
            }}</span>
            <span
              :class="[
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                getColor(p.status),
              ]"
            >
              {{ getLabel(p.status) }}
            </span>
            <span class="text-xs text-slate-400 capitalize">{{
              p.tipe_pesanan?.replace("_", " ")
            }}</span>
          </div>
          <p class="text-sm text-slate-600 mt-0.5">{{ p.nama_pelanggan }}</p>
          <p class="text-xs text-slate-400 mt-0.5">
            {{
              new Date(p.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }}
          </p>
        </div>

        <!-- Total -->
        <p class="font-bold text-slate-800 text-sm shrink-0">
          Rp {{ p.total_harga.toLocaleString("id-ID") }}
        </p>

        <!-- Status Actions -->
        <div class="flex gap-1.5 flex-wrap shrink-0 items-center">
          <button
            @click="openDetail(p)"
            class="p-2 mr-2 text-slate-400 hover:text-primary transition rounded-lg hover:bg-slate-100"
            title="Lihat Detail / Edit"
          >
            <i class="bx bx-show text-xl"></i>
          </button>
          
          <div class="h-8 w-px bg-slate-100 mr-2 hidden sm:block"></div>

          <button
            v-for="s in statusOptions"
            :key="s.value"
            @click="updateStatus(p.id, s.value)"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
              p.status === s.value
                ? s.color + ' ring-2 ring-offset-1 ring-current opacity-100'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            ]"
          >
            {{ s.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal (Shared) -->
    <OrderDetailModal
      :show="showDetailModal"
      :pesanan="selectedPesanan"
      @close="showDetailModal = false"
      @updated="handleUpdate"
    />
  </div>
</template>
