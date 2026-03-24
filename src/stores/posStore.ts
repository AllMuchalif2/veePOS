import { defineStore } from "pinia";
import { ref } from "vue";
import localforage from "localforage";
import { supabase } from "../supabaseClient";
import { useAuthStore } from "./authStore";

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
  tersedia: boolean;
}

export interface Meja {
  id: string;
  nomor_meja: string;
  slug?: string;
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
  metode_pembayaran?: string;
  items: {
    id_menu: string;
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
        // Get current user's toko first
        const authStore = useAuthStore();
        const idToko = authStore.profile?.id_toko;

        if (!idToko) throw new Error("Profil toko tidak ditemukan");

        // Fetch only this store's data
        const [catRes, prodRes, tableRes] = await Promise.all([
          supabase
            .from("kategori")
            .select("*")
            .eq("id_toko", idToko)
            .is("deleted_at", null)
            .order("nama"),
          supabase
            .from("menu")
            .select("*")
            .eq("id_toko", idToko)
            .eq("tersedia", true)
            .is("deleted_at", null)
            .order("nama"),
          supabase
            .from("meja")
            .select("*")
            .eq("id_toko", idToko)
            .is("deleted_at", null)
            .order("nomor_meja"),
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
      // Get current user's id_toko and id_kasir
      const authStore = useAuthStore();
      const idKasir = authStore.user?.id;
      const idToko = authStore.profile?.id_toko;

      if (!idKasir || !idToko) throw new Error("Auth/Profile not found");

      const payload = {
        p_id_toko: idToko,
        p_id_meja: order.id_meja,
        p_nama_pelanggan: order.nama_pelanggan,
        p_tipe_pesanan: order.tipe_pesanan,
        p_total_harga: order.total_harga,
        p_metode_pembayaran: order.metode_pembayaran ?? null,
        p_id_kasir: idKasir,
        p_items: order.items,
      };

      const { data, error } = await supabase.rpc("submit_order", payload);

      if (error) throw error;
      if (!data.success) throw new Error("RPC transaction failed");

      // Update local meja status for immediate reactivity
      if (order.tipe_pesanan === "dine_in" && order.id_meja) {
        const table = tables.value.find((t) => t.id === order.id_meja);
        if (table) table.status = "terisi";
      }

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
