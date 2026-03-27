<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { supabase } from "../../supabaseClient";
import { swalError, swalSuccess, swalConfirm } from "../../composables/useSwal";
import { useAuthStore } from "../../stores/authStore";
import { usePosStore } from "../../stores/posStore";

const posStore = usePosStore();

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
const orderItems = ref<any[]>([]);
const loadingItems = ref(false);
const originalTotal = ref(0);


// Add Menu State
const showAddMenu = ref(false);
const itemSearch = ref("");



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
    const authStore = useAuthStore();
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

const openDetail = async (p: Pesanan) => {
  selectedPesanan.value = p;
  originalTotal.value = p.total_harga; // Catat harga awal sebelum di-edit
  showDetailModal.value = true;
  loadingItems.value = true;
  orderItems.value = await posStore.fetchOrderDetails(p.id);
  loadingItems.value = false;
};


const handleStokKosong = async (item: any) => {
  const isConfirmed = await swalConfirm(
    "Stok Habis?",
    `Item "${item.menu?.nama}" akan dibatalkan dari pesanan ini dan menu akan dimatikan dari katalog. Lanjutkan?`
  );

  if (isConfirmed) {
    try {
      await posStore.markItemAsEmpty(item.id);
      await swalSuccess("Berhasil", "Item dibatalkan dan total harga diperbarui.");
      
      // Refresh detail data
      if (selectedPesanan.value) {
        orderItems.value = await posStore.fetchOrderDetails(selectedPesanan.value.id);
        // Refresh main list for total_harga update
        await loadPesanan();
        // Update selectedPesanan reference to show new total
        selectedPesanan.value = pesananList.value.find(p => p.id === selectedPesanan.value?.id) || null;
      }
    } catch (err: any) {
      await swalError("Gagal menunda item", err.message);
    }
  }
};

const availableProducts = computed(() => {
  return posStore.products
    .filter(p => p.tersedia)
    .filter(p => p.nama.toLowerCase().includes(itemSearch.value.toLowerCase()));
});

const totalDiff = computed(() => {
  if (!selectedPesanan.value) return 0;
  return selectedPesanan.value.total_harga - originalTotal.value;
});



const handleAddMenu = async (menu: any) => {
  if (!selectedPesanan.value) return;
  
  try {
    processing.value = true;
    await posStore.addItemToOrder(selectedPesanan.value.id, menu.id, 1);
    await swalSuccess("Berhasil", `${menu.nama} ditambahkan ke pesanan.`);
    
    // Refresh
    orderItems.value = await posStore.fetchOrderDetails(selectedPesanan.value.id);
    await loadPesanan();
    selectedPesanan.value = pesananList.value.find(p => p.id === selectedPesanan.value?.id) || null;
    showAddMenu.value = false;
  } catch (err: any) {
    await swalError("Gagal menambah menu", err.message);
  } finally {
    processing.value = false;
  }
};

const processing = ref(false);



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

    <!-- Detail Modal -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="showDetailModal = false"
    >
      <div class="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 class="font-bold text-slate-800">Detail Pesanan</h3>
            <p class="text-xs text-slate-500">{{ selectedPesanan?.nomor_pesanan }} - {{ selectedPesanan?.nama_pelanggan }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button 
              v-if="selectedPesanan?.status === 'pending' || selectedPesanan?.status === 'diproses'"
              @click="showAddMenu = !showAddMenu"
              class="text-xs font-bold px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition flex items-center gap-1"
            >
              <i class="bx" :class="showAddMenu ? 'bx-chevron-left' : 'bx-plus'"></i>
              {{ showAddMenu ? 'Kembali' : 'Tambah Menu' }}
            </button>
            <button @click="showDetailModal = false; showAddMenu = false" class="p-2 text-slate-400 hover:text-slate-600 transition">
              <i class="bx bx-x text-2xl"></i>
            </button>
          </div>
        </div>

        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div v-if="loadingItems" class="text-center py-8">
            <i class="bx bx-loader-alt bx-spin text-3xl text-primary"></i>
          </div>
          
          <!-- View: Menu Picker (Swap/Add) -->
          <div v-else-if="showAddMenu" class="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div class="sticky top-0 bg-white pb-2 z-10">
              <div class="relative">
                <i class="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  v-model="itemSearch"
                  type="text" 
                  placeholder="Cari menu pengganti..." 
                  class="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            
            <div class="grid grid-cols-1 gap-2">
              <button 
                v-for="p in availableProducts" 
                :key="p.id"
                @click="handleAddMenu(p)"
                :disabled="processing"
                class="flex items-center gap-3 p-2 hover:bg-slate-50 transition rounded-xl border border-transparent hover:border-slate-200 text-left"
              >
                <div class="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                  <img v-if="p.foto_url" :src="p.foto_url" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1">
                  <h5 class="text-sm font-bold text-slate-800">{{ p.nama }}</h5>
                  <p class="text-xs text-primary font-bold">Rp {{ p.harga.toLocaleString('id-ID') }}</p>
                </div>
                <i class="bx bx-plus text-slate-300"></i>
              </button>
            </div>
          </div>

          <!-- View: Item List -->
          <div v-else class="space-y-4">

            <div v-for="item in orderItems" :key="item.id" class="flex items-center gap-4 group">
              <div class="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
                <img v-if="item.menu?.foto_url" :src="item.menu.foto_url" class="w-full h-full object-cover" />

                <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                  <i class="bx bx-image text-2xl"></i>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-slate-800 truncate">{{ item.menu?.nama || 'Menu Terhapus' }}</h4>
                  <span v-if="item.status === 'kosong'" class="px-1.5 py-0.5 rounded bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider">Stok Kosong</span>
                </div>
                <p class="text-xs text-slate-500">{{ item.jumlah }}x @ Rp {{ (item.harga_satuan || 0).toLocaleString('id-ID') }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-slate-800">Rp {{ (item.subtotal || 0).toLocaleString('id-ID') }}</p>
                <!-- Action: Mark empty only if previously normal and status allows edit (pending/diproses) -->
                <button 
                  v-if="item.status !== 'kosong' && (selectedPesanan?.status === 'pending' || selectedPesanan?.status === 'diproses')"
                  @click="handleStokKosong(item)"
                  class="text-[10px] text-danger hover:underline mt-1 font-medium"
                >
                  Stok Kosong
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
          <!-- Logika Selisih Harga (Net) -->
          <div v-if="totalDiff < 0" class="flex justify-between items-center text-danger bg-danger/5 p-3 rounded-xl border border-danger/20">
            <div class="flex flex-col">
              <span class="text-xs font-medium uppercase tracking-wider opacity-70">Sisa Pengembalian</span>
              <span class="text-danger font-black">Kembalikan Rp {{ Math.abs(totalDiff).toLocaleString('id-ID') }}</span>
            </div>
            <i class="bx bx-left-arrow-circle text-2xl"></i>
          </div>

          <div v-else-if="totalDiff > 0" class="flex justify-between items-center text-primary bg-primary/5 p-3 rounded-xl border border-primary/20">
            <div class="flex flex-col">
              <span class="text-xs font-medium uppercase tracking-wider opacity-70">Kurang Bayar</span>
              <span class="text-danger font-black">Tagih Tambahan Rp {{ totalDiff.toLocaleString('id-ID') }}</span>
            </div>
            <i class="bx bx-plus-circle text-2xl"></i>
          </div>
          
          <div class="flex justify-between items-center px-1">
            <span class="text-xs text-slate-500 font-medium italic">Nota Awal: Rp {{ originalTotal.toLocaleString('id-ID') }}</span>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block uppercase font-bold tracking-tight">Total Akhir</span>
              <span class="text-lg font-black text-slate-900">Rp {{ selectedPesanan?.total_harga.toLocaleString('id-ID') }}</span>
            </div>
          </div>
          
          <button 
            @click="showDetailModal = false; showAddMenu = false"
            class="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition active:scale-[0.98] mt-2 shadow-lg shadow-slate-200"
          >
            Tutup
          </button>
        </div>


      </div>
    </div>

  </div>
</template>
