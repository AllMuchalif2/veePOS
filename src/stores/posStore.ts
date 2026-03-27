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

  window.addEventListener("online", () => {
    isOnline.value = true;
    syncPendingOrders();
  });
  window.addEventListener("offline", () => {
    isOnline.value = false;
  });

  const fetchMenu = async () => {
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const authStore = useAuthStore();
        const idToko = authStore.profile?.id_toko;

        if (!idToko) throw new Error("Profil toko tidak ditemukan");

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
      const cachedProd = await localforage.getItem<Produk[]>("pos_products");
      if (cachedProd) products.value = cachedProd;
    } finally {
      isLoading.value = false;
    }
  };

  const loadPendingOrders = async () => {
    const cached =
      await localforage.getItem<PendingOrder[]>("pos_pending_orders");
    if (cached) {
      pendingOrders.value = cached;
      if (isOnline.value) syncPendingOrders();
    }
  };

  const saveOffline = async (order: PendingOrder) => {
    order.id = "TRX-" + Date.now();
    order.created_at = new Date().toISOString();
    
    // Hapus proxy Reactivity Vue agar bisa disimpan ke IndexedDB
    const plainOrder = JSON.parse(JSON.stringify(order));
    pendingOrders.value.push(plainOrder);
    
    await localforage.setItem(
      "pos_pending_orders",
      JSON.parse(JSON.stringify(pendingOrders.value))
    );
    return { success: true, offline: true };
  };

  const submitOrder = async (order: PendingOrder) => {
    if (isOnline.value) {
      try {
        return await sendOrderToSupabase(order);
      } catch (err: any) {
        // Gabungkan seluruh pesan error jadi string agar pasti ketahuan jika itu masalah koneksi
        const errMsg = String(err?.message || "") + String(err?.details || "") + String(err);
        
        if (
          errMsg.includes("Failed to fetch") || 
          errMsg.includes("NetworkError") || 
          errMsg.includes("offline") ||
          errMsg.includes("network")
        ) {
          console.warn("Internet ngadat (atau ter-block CORS/Fetch), paksa beralih ke simpan offline...", errMsg);
          return await saveOffline(order);
        }
        
        throw err;
      }
    } else {
      return await saveOffline(order);
    }
  };

  const sendOrderToSupabase = async (order: PendingOrder) => {
    try {
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
    await localforage.setItem(
      "pos_pending_orders",
      JSON.parse(JSON.stringify(pendingOrders.value))
    );
    isSyncing.value = false;
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("detail_pesanan")
        .select(`
          *,
          menu:id_menu(nama, foto_url)
        `)
        .eq("id_pesanan", orderId)
        .order("created_at");

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching order details:", error);
      return [];
    }
  };

  const markItemAsEmpty = async (detailId: string) => {
    try {
      const { data, error } = await supabase.rpc("handle_item_unavailable", {
        p_detail_id: detailId,
      });

      if (error) throw error;
      
      await fetchMenu();
      return data;
    } catch (error) {
      console.error("Error marking item as empty:", error);
      throw error;
    }
  };

  const addItemToOrder = async (orderId: string, menuId: string, jumlah: number) => {
    try {
      const authStore = useAuthStore();
      const idToko = authStore.profile?.id_toko;
      if (!idToko) throw new Error("Toko ID not found");

      const { data, error } = await supabase.rpc("add_item_to_order", {
        p_order_id: orderId,
        p_menu_id: menuId,
        p_jumlah: jumlah,
        p_id_toko: idToko
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error adding item to order:", error);
      throw error;
    }
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
    fetchOrderDetails,
    markItemAsEmpty,
    addItemToOrder,
  };
});
