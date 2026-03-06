import { defineStore } from "pinia";
import { ref } from "vue";
import localforage from "localforage";
import { supabase } from "../supabaseClient";

export interface Kategori {
  id: string;
  nama: string;
}

export interface Produk {
  id: string;
  id_kategori: string | null;
  nama: string;
  harga: number;
  foto_url: string | null;
}

export interface Meja {
  id: string;
  nomor_meja: string;
  status?: string;
}

export interface CartItem extends Produk {
  qty: number;
}

// Format of an order ready to be submitted
export interface PendingOrder {
  id?: string; // local id
  id_meja: string | null;
  nama_pelanggan: string;
  tipe_pesanan: "dine_in" | "takeaway" | "qr_menu";
  total_harga: number;
  items: {
    id_produk: string;
    jumlah: number;
    harga_satuan: number;
    subtotal: number;
  }[];
  created_at?: string;
}

export const usePosStore = defineStore("pos", () => {
  const categories = ref<Kategori[]>([]);
  const products = ref<Produk[]>([]);
  const tables = ref<Meja[]>([]);
  const pendingOrders = ref<PendingOrder[]>([]);

  const isOnline = ref(navigator.onLine);
  const isSyncing = ref(false);
  const isLoading = ref(false);

  // Listen to network changes
  window.addEventListener("online", () => {
    isOnline.value = true;
    syncPendingOrders(); // auto-sync when back online
  });
  window.addEventListener("offline", () => {
    isOnline.value = false;
  });

  // Load from Supabase OR from LocalForage if offline
  const fetchMenu = async () => {
    isLoading.value = true;
    try {
      if (isOnline.value) {
        // Fetch from Supabase
        const [catRes, prodRes, tableRes] = await Promise.all([
          supabase.from("kategori").select("*").order("nama"),
          supabase.from("produk").select("*").order("nama"),
          supabase.from("meja").select("*").order("nomor_meja"),
        ]);

        if (catRes.data) categories.value = catRes.data;
        if (prodRes.data) products.value = prodRes.data;
        if (tableRes.data) tables.value = tableRes.data;

        // Cache to LocalForage (strip proxies to avoid DataCloneError)
        await localforage.setItem(
          "pos_categories",
          JSON.parse(JSON.stringify(categories.value)),
        );
        await localforage.setItem(
          "pos_products",
          JSON.parse(JSON.stringify(products.value)),
        );
        await localforage.setItem(
          "pos_tables",
          JSON.parse(JSON.stringify(tables.value)),
        );
      } else {
        // Load from cache
        const cachedCat =
          await localforage.getItem<Kategori[]>("pos_categories");
        const cachedProd = await localforage.getItem<Produk[]>("pos_products");
        const cachedTab = await localforage.getItem<Meja[]>("pos_tables");

        if (cachedCat) categories.value = cachedCat;
        if (cachedProd) products.value = cachedProd;
        if (cachedTab) tables.value = cachedTab;
      }
    } catch (error) {
      console.error("Error fetching menu:", error);
      // Fallback to cache on error
      const cachedProd = await localforage.getItem<Produk[]>("pos_products");
      if (cachedProd) products.value = cachedProd;
    } finally {
      isLoading.value = false;
    }
  };

  // Load pending orders from cache on startup
  const loadPendingOrders = async () => {
    const cached =
      await localforage.getItem<PendingOrder[]>("pos_pending_orders");
    if (cached) {
      pendingOrders.value = cached;
      if (isOnline.value) syncPendingOrders();
    }
  };

  // Save an order (either straight to Supabase if online, or to queue if offline)
  const submitOrder = async (order: PendingOrder) => {
    if (isOnline.value) {
      return await sendOrderToSupabase(order);
    } else {
      // Save offline
      order.id = "TRX-" + Date.now();
      order.created_at = new Date().toISOString();
      pendingOrders.value.push(order);
      await localforage.setItem("pos_pending_orders", pendingOrders.value);
      return { success: true, offline: true };
    }
  };

  // Actual Supabase submission logic inside RPC or individual tables
  const sendOrderToSupabase = async (order: PendingOrder) => {
    try {
      // Get current user's id_toko
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not logged in");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id_toko")
        .eq("id", userData.user.id)
        .single();
      if (!profile) throw new Error("Profile not found");

      // Insert Pesanan
      const { data: pesanan, error: pesananErr } = await supabase
        .from("pesanan")
        .insert({
          id_toko: profile.id_toko,
          id_meja: order.id_meja,
          nama_pelanggan: order.nama_pelanggan,
          tipe_pesanan: order.tipe_pesanan,
          total_harga: order.total_harga,
          status: "selesai",
          nomor_pesanan: `INV-${Date.now()}`,
          id_kasir: userData.user.id,
        })
        .select()
        .single();

      if (pesananErr) throw pesananErr;

      // Insert Detail Pesanan
      const details = order.items.map((item) => ({
        id_pesanan: pesanan.id,
        id_toko: profile.id_toko,
        id_produk: item.id_produk,
        jumlah: item.jumlah,
        harga_satuan: item.harga_satuan,
        subtotal: item.subtotal,
      }));

      const { error: detailErr } = await supabase
        .from("detail_pesanan")
        .insert(details);
      if (detailErr) throw detailErr;

      return { success: true, offline: false };
    } catch (error) {
      console.error("Submit direct error:", error);
      throw error;
    }
  };

  const syncPendingOrders = async () => {
    if (isSyncing.value || pendingOrders.value.length === 0 || !isOnline.value)
      return;
    isSyncing.value = true;

    const failedOrders = [];

    for (const order of pendingOrders.value) {
      try {
        await sendOrderToSupabase(order);
      } catch (error) {
        console.error("Failed to sync order:", order.id, error);
        failedOrders.push(order);
      }
    }

    pendingOrders.value = failedOrders;
    await localforage.setItem("pos_pending_orders", pendingOrders.value);
    isSyncing.value = false;
  };

  return {
    categories,
    products,
    tables,
    pendingOrders,
    isOnline,
    isSyncing,
    isLoading,
    fetchMenu,
    loadPendingOrders,
    submitOrder,
    syncPendingOrders,
  };
});
