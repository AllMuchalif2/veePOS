import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabaseClient";
import { useAuthStore } from "../stores/authStore";

interface PesananRingkasan {
  id: string;
  nomor_pesanan: string | null;
  nama_pelanggan: string | null;
  tipe_pesanan: string;
  metode_pembayaran: string | null;
  total_harga: number;
  created_at: string;
}

interface Meja {
  id: string;
  nomor_meja: string;
  status: string;
}

interface MenuItem {
  id: string;
  nama: string;
  harga: number;
  foto_url: string | null;
  tersedia: boolean;
  id_kategori: string | null;
  kategori?: { nama: string } | null;
}

export function useKasirDashboardPresenter() {
  const router = useRouter();
  const auth = useAuthStore();

  const activeTab = ref<"ringkasan" | "pesanan" | "meja" | "menu" | "profil">("ringkasan");
  const loading = ref(false);

  const pesananHariIni = ref<PesananRingkasan[]>([]);

  const totalPesanan = computed(() => pesananHariIni.value.length);
  const totalPendapatan = computed(() =>
    pesananHariIni.value.reduce((s, p) => s + Number(p.total_harga), 0),
  );
  const totalDineIn = computed(
    () =>
      pesananHariIni.value.filter((p) => p.tipe_pesanan === "dine_in").length,
  );
  const totalTakeaway = computed(
    () =>
      pesananHariIni.value.filter((p) => p.tipe_pesanan === "takeaway").length,
  );

  const fetchRingkasan = async () => {
    await auth.loadUser();
    if (!auth.user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("pesanan")
      .select(
        "id, nomor_pesanan, nama_pelanggan, tipe_pesanan, metode_pembayaran, total_harga, created_at",
      )
      .eq("id_kasir", auth.user.id)
      .gte("created_at", today.toISOString())
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data) pesananHariIni.value = data;
  };

  const mejaList = ref<Meja[]>([]);

  const fetchMeja = async () => {
    await auth.loadUser();
    const idToko = auth.profile?.id_toko;
    if (!idToko) return;

    const { data } = await supabase
      .from("meja")
      .select("id, nomor_meja, status")
      .eq("id_toko", idToko)
      .is("deleted_at", null)
      .order("nomor_meja");

    if (data) mejaList.value = data;
  };

  const toggleMeja = async (meja: Meja) => {
    const newStatus = meja.status === "tersedia" ? "terisi" : "tersedia";
    const { error } = await supabase
      .from("meja")
      .update({ status: newStatus })
      .eq("id", meja.id);

    if (!error) {
      meja.status = newStatus;
    }
  };

  const menuList = ref<MenuItem[]>([]);

  const fetchMenuList = async () => {
    await auth.loadUser();
    const idToko = auth.profile?.id_toko;
    if (!idToko) return;

    const { data } = await supabase
      .from("menu")
      .select(
        "id, nama, harga, foto_url, tersedia, id_kategori, kategori:id_kategori(nama)",
      )
      .eq("id_toko", idToko)
      .is("deleted_at", null)
      .order("nama");

    if (data) menuList.value = data as unknown as MenuItem[];
  };

  const toggleMenu = async (item: MenuItem) => {
    const newVal = !item.tersedia;
    const { error } = await supabase
      .from("menu")
      .update({ tersedia: newVal })
      .eq("id", item.id);

    if (!error) {
      item.tersedia = newVal;
    }
  };

  onMounted(async () => {
    loading.value = true;
    await Promise.all([fetchRingkasan(), fetchMeja(), fetchMenuList()]);
    loading.value = false;
  });

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return {
    router,
    activeTab,
    loading,
    pesananHariIni,
    totalPesanan,
    totalPendapatan,
    totalDineIn,
    totalTakeaway,
    mejaList,
    toggleMeja,
    menuList,
    toggleMenu,
    logout,
  };
}
