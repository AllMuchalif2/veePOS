import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../supabaseClient";
import { usePwaInstall } from "../composables/usePwaInstall";

export interface ProdukPelanggan {
  id: string;
  nama: string;
  harga: number;
  foto_url: string | null;
  id_kategori: string | null;
}

export function useMenuPelangganPresenter() {
  const route = useRoute();
  const idToko = route.query.toko as string;
  const idMeja = route.query.meja as string;
  const { isInstallable, installApp } = usePwaInstall();

  const products = ref<ProdukPelanggan[]>([]);
  const loading = ref(true);
  const namaPelanggan = ref("");
  const processing = ref(false);
  const orderSuccess = ref(false);
  const isCartOpen = ref(false);

  const cart = ref<{ product: ProdukPelanggan; qty: number }[]>([]);

  const totalCartAmount = computed(() => {
    return cart.value.reduce(
      (total, item) => total + item.product.harga * item.qty,
      0,
    );
  });

  const cartItemsCount = computed(() => {
    return cart.value.reduce((total, item) => total + item.qty, 0);
  });

  const loadMenu = async () => {
    if (!idToko) {
      alert("QR Code tidak valid (id_toko hilang)");
      loading.value = false;
      return;
    }

    try {
      const { data: produkData, error } = await supabase
        .from("menu")
        .select("*")
        .eq("id_toko", idToko)
        .order("nama");

      if (error) throw error;
      if (produkData) products.value = produkData;
    } catch (err: any) {
      alert("Gagal memuat menu: " + err.message);
    } finally {
      loading.value = false;
    }
  };

  const addToCart = (product: ProdukPelanggan) => {
    const existing = cart.value.find((item) => item.product.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      cart.value.push({ product, qty: 1 });
    }
  };

  const updateQty = (index: number, delta: number) => {
    const item = cart.value[index];
    if (item.qty + delta > 0) {
      item.qty += delta;
    } else {
      cart.value.splice(index, 1);
      if (cart.value.length === 0) isCartOpen.value = false;
    }
  };

  const submitOrder = async () => {
    if (cart.value.length === 0) return alert("Keranjang kosong");
    if (!namaPelanggan.value) return alert("Mohon isi nama Anda");

    processing.value = true;
    try {
      const { data: pesanan, error: pesananErr } = await supabase
        .from("pesanan")
        .insert({
          id_toko: idToko,
          id_meja: idMeja || null,
          nama_pelanggan: namaPelanggan.value,
          tipe_pesanan: "qr_menu",
          total_harga: totalCartAmount.value,
          status: "pending",
          nomor_pesanan: `QR-${Date.now()}`,
        })
        .select()
        .single();

      if (pesananErr) throw pesananErr;

      const details = cart.value.map((item) => ({
        id_pesanan: pesanan.id,
        id_toko: idToko,
        id_menu: item.product.id,
        jumlah: item.qty,
        harga_satuan: item.product.harga,
        subtotal: item.qty * item.product.harga,
      }));

      const { error: detailErr } = await supabase
        .from("detail_pesanan")
        .insert(details);
      if (detailErr) throw detailErr;

      orderSuccess.value = true;
      cart.value = [];
      isCartOpen.value = false;
    } catch (err: any) {
      alert("Gagal mengirim pesanan: " + err.message);
    } finally {
      processing.value = false;
    }
  };

  onMounted(() => {
    loadMenu();
  });

  return {
    idMeja,
    isInstallable,
    installApp,
    products,
    loading,
    namaPelanggan,
    processing,
    orderSuccess,
    cart,
    isCartOpen,
    totalCartAmount,
    cartItemsCount,
    addToCart,
    updateQty,
    submitOrder,
  };
}
