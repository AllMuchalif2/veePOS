import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalError } from "./useSwal";
import { useAuthStore } from "../stores/authStore";

export interface DetailPesanan {
  id: string;
  id_menu: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  produk: { nama: string };
}

export interface Pesanan {
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

export function useAdminRiwayatTab() {
  const riwayat = ref<Pesanan[]>([]);
  const loading = ref(true);
  const filterDate = ref(new Date().toISOString().split("T")[0]);
  const stats = ref({ totalTransaksi: 0, totalPendapatan: 0 });

  const loadRiwayat = async () => {
    loading.value = true;
    try {
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;

      if (!tokoId) return;

      const startOfDay = new Date(filterDate.value);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate.value);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("pesanan")
        .select(
          `id, nomor_pesanan, nama_pelanggan, status, total_harga, metode_pembayaran, created_at, id_kasir, id_meja,
          meja:id_meja(nomor_meja),
          kasir:id_kasir(nama)`,
        )
        .eq("id_toko", tokoId)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      let totalRp = 0;
      const mapped = data.map((p: any) => {
        if (p.status === "selesai") totalRp += p.total_harga;
        return {
          ...p,
          kasir_nama: p.kasir?.nama ?? "Self-Order (QR)",
          meja_nomor: p.meja?.nomor_meja ?? "Takeaway",
          detail_pesanan: [],
        };
      });

      riwayat.value = mapped;
      stats.value = { totalTransaksi: mapped.length, totalPendapatan: totalRp };
    } catch (error) {
      console.error("Error loading riwayat", error);
    } finally {
      loading.value = false;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "selesai":
        return "bg-success/20 text-success";
      case "batal":
        return "bg-danger/20 text-danger";
      case "menunggu":
        return "bg-warning/20 text-warning";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const statusOptions = ["pending", "menunggu", "selesai", "batal"];

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("pesanan")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      // Optimistic update
      const item = riwayat.value.find((r) => r.id === id);
      if (item) {
        item.status = newStatus;
        // Recalculate stats
        stats.value.totalPendapatan = riwayat.value
          .filter((r) => r.status === "selesai")
          .reduce((sum, r) => sum + r.total_harga, 0);
      }
    } catch (err: any) {
      await swalError("Gagal mengubah status", err.message);
    }
  };

  onMounted(() => {
    loadRiwayat();
  });

  return {
    riwayat,
    loading,
    filterDate,
    stats,
    loadRiwayat,
    getStatusBadgeClass,
    statusOptions,
    updateStatus,
  };
}
