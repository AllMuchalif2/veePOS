import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabaseClient";
import { usePosStore, type Produk } from "../stores/posStore";
import { usePwaInstall } from "../composables/usePwaInstall";

export function useKasirPresenter() {
  const router = useRouter();
  const posStore = usePosStore();
  const { isInstallable, installApp } = usePwaInstall();

  const cart = ref<{ product: Produk; qty: number }[]>([]);
  const customerName = ref("");
  const selectedTable = ref("");
  const orderType = ref<"dine_in" | "takeaway" | "qr_menu">("dine_in");
  const processing = ref(false);

  const realtimeNotifications = ref<{ id: string; msg: string }[]>([]);

  // Realtime Subscription Placeholder
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
    if (cart.value.length === 0) return alert("Keranjang kosong");
    if (!customerName.value && orderType.value !== "qr_menu")
      return alert("Nama pelanggan wajib diisi");

    processing.value = true;
    try {
      const orderData = {
        id_meja: selectedTable.value || null,
        nama_pelanggan: customerName.value,
        tipe_pesanan: orderType.value,
        total_harga: totalCartAmount.value,
        items: cart.value.map((c) => ({
          id_menu: c.product.id,
          jumlah: c.qty,
          harga_satuan: c.product.harga,
          subtotal: c.qty * c.product.harga,
        })),
      };

      const res = await posStore.submitOrder(orderData);
      if (res.offline) {
        alert("Pesanan disimpan offline (akan disinkronkan saat online)");
      } else {
        alert("Pesanan berhasil!");
      }

      // Reset form
      cart.value = [];
      customerName.value = "";
      selectedTable.value = "";
    } catch (error: any) {
      alert("Checkout gagal: " + error.message);
    } finally {
      processing.value = false;
    }
  };

  const setupRealtime = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id_toko")
      .eq("id", userData.user.id)
      .single();
    if (!profile) return;

    pesananSubscription = supabase
      .channel("public:pesanan")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pesanan",
          filter: `id_toko=eq.${profile.id_toko}`,
        },
        (payload) => {
          // Notification for new order, particularly from QR Menu
          if (payload.new.status === "pending") {
            realtimeNotifications.value.push({
              id: payload.new.id,
              msg: `Pesanan Baru dari ${payload.new.nama_pelanggan || "Pelanggan"} (Total: Rp ${payload.new.total_harga.toLocaleString("id-ID")})`,
            });

            // Auto remove notif after 10s
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
    addToCart,
    removeFromCart,
    updateQty,
    handleCheckout,
    logout,
  };
}
