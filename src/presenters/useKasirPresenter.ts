import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabaseClient";
import { usePosStore, type Produk } from "../stores/posStore";
import { usePwaInstall } from "../composables/usePwaInstall";
import { useAuthStore } from "../stores/authStore";
import { swalSuccess, swalError } from "../composables/useSwal";

export function useKasirPresenter() {
  const router = useRouter();
  const posStore = usePosStore();
  const auth = useAuthStore();
  const { isInstallable, installApp } = usePwaInstall();

  const goToDashboard = async () => {
    await auth.loadUser();
    if (auth.profile?.role === "admin") {
      router.push("/admin-toko");
    } else {
      router.push("/kasir-dashboard");
    }
  };

  const cart = ref<{ product: Produk; qty: number }[]>([]);
  const customerName = ref("");
  const selectedTable = ref("");
  const orderType = ref<"dine_in" | "takeaway" | "qr_menu">("dine_in");
  const processing = ref(false);

  // Payment
  const metodePembayaran = ref<"tunai" | "transfer" | "qris">("tunai");
  const nominalBayar = ref<number | "">("");
  const kembalian = computed(() => {
    if (metodePembayaran.value !== "tunai") return 0;
    const bayar = Number(nominalBayar.value) || 0;
    return Math.max(0, bayar - totalCartAmount.value);
  });

  const realtimeNotifications = ref<{ id: string; msg: string }[]>([]);

  const searchQuery = ref("");
  const selectedCategory = ref<string | null>(null);

  const filteredProducts = computed(() => {
    let prods = posStore.products;
    if (selectedCategory.value) {
      prods = prods.filter((p) => p.id_kategori === selectedCategory.value);
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      prods = prods.filter((p) => p.nama.toLowerCase().includes(q));
    }
    return prods;
  });

  let pesananSubscription: any = null;

  const totalCartAmount = computed(() => {
    return cart.value.reduce(
      (total, item) => total + item.product.harga * item.qty,
      0,
    );
  });

  const addToCart = (product: Produk) => {
    const existing = cart.value.find((item) => item.product.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      cart.value.push({ product, qty: 1 });
    }
  };

  const removeFromCart = (index: number) => {
    cart.value.splice(index, 1);
  };

  const updateQty = (index: number, delta: number) => {
    const item = cart.value[index];
    if (item.qty + delta > 0) {
      item.qty += delta;
    } else {
      removeFromCart(index);
    }
  };

  const handleCheckout = async () => {
    if (cart.value.length === 0) {
      await swalError("Keranjang kosong", "Tambahkan menu terlebih dahulu");
      return;
    }
    if (!customerName.value && orderType.value !== "qr_menu") {
      await swalError("Nama wajib diisi", "Masukkan nama pelanggan");
      return;
    }
    if (!metodePembayaran.value) {
      await swalError(
        "Metode pembayaran",
        "Pilih metode pembayaran terlebih dahulu",
      );
      return;
    }
    if (
      metodePembayaran.value === "tunai" &&
      (Number(nominalBayar.value) || 0) < totalCartAmount.value
    ) {
      await swalError(
        "Nominal kurang",
        "Nominal bayar kurang dari total harga",
      );
      return;
    }

    processing.value = true;
    try {
      const orderData = {
        id_meja: selectedTable.value || null,
        nama_pelanggan: customerName.value,
        tipe_pesanan: orderType.value,
        total_harga: totalCartAmount.value,
        metode_pembayaran: metodePembayaran.value,
        items: cart.value.map((c) => ({
          id_menu: c.product.id,
          jumlah: c.qty,
          harga_satuan: c.product.harga,
          subtotal: c.qty * c.product.harga,
        })),
      };

      const res = await posStore.submitOrder(orderData);
      if (res.offline) {
        await swalSuccess(
          "Disimpan Offline",
          "Pesanan akan disinkronkan saat online",
        );
      } else {
        await swalSuccess(
          "Pesanan Berhasil!",
          "Pesanan telah dikirim ke dapur",
        );
      }

      cart.value = [];
      customerName.value = "";
      selectedTable.value = "";
      nominalBayar.value = "";
      metodePembayaran.value = "tunai";
    } catch (error: any) {
      await swalError("Checkout Gagal", error.message);
    } finally {
      processing.value = false;
    }
  };

  const setupRealtime = async () => {
    const tokoId = auth.profile?.id_toko;
    if (!tokoId) return;

    pesananSubscription = supabase
      .channel("public:pesanan")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pesanan",
          filter: `id_toko=eq.${tokoId}`,
        },
        (payload) => {
          if (payload.new.status === "pending") {
            realtimeNotifications.value.push({
              id: payload.new.id,
              msg: `Pesanan Baru dari ${payload.new.nama_pelanggan || "Pelanggan"} (Total: Rp ${payload.new.total_harga.toLocaleString("id-ID")})`,
            });

            setTimeout(() => {
              realtimeNotifications.value.shift();
            }, 10000);
          }
        },
      )
      .subscribe();
  };

  onMounted(async () => {
    await posStore.fetchMenu();
    await posStore.loadPendingOrders();
    setupRealtime();
  });

  onUnmounted(() => {
    if (pesananSubscription) {
      supabase.removeChannel(pesananSubscription);
    }
  });

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return {
    router,
    posStore,
    isInstallable,
    installApp,
    cart,
    customerName,
    selectedTable,
    orderType,
    processing,
    realtimeNotifications,
    totalCartAmount,
    metodePembayaran,
    nominalBayar,
    kembalian,
    searchQuery,
    selectedCategory,
    filteredProducts,
    addToCart,
    removeFromCart,
    updateQty,
    handleCheckout,
    goToDashboard,
    logout,
  };
}
