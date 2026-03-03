import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../supabaseClient";

export interface Toko {
  id: string;
  nama_toko: string;
  created_at: string;
}

export interface AdminAccount {
  id: string;
  id_toko: string;
  role: string;
  nama: string;
  created_at: string;
  toko_nama?: string;
}

export const useSuperadminStore = defineStore("superadmin", () => {
  const toko = ref<Toko[]>([]);
  const adminAccounts = ref<AdminAccount[]>([]);
  const loading = ref(false);

  // Load all toko
  const fetchToko = async () => {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("toko")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      toko.value = data || [];
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Load all admin accounts with toko info
  const fetchAdminAccounts = async () => {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
          id,
          id_toko,
          role,
          nama,
          created_at,
          toko:id_toko(nama_toko)
        `
        )
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) throw error;

      adminAccounts.value =
        data?.map((a: any) => ({
          ...a,
          toko_nama: a.toko?.nama_toko || "N/A",
        })) || [];
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Create new toko
  const createToko = async (nama_toko: string) => {
    try {
      const { data, error } = await supabase
        .from("toko")
        .insert({ nama_toko })
        .select()
        .single();
      if (error) throw error;
      toko.value.unshift(data);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Update toko
  const updateToko = async (id: string, nama_toko: string) => {
    try {
      const { error } = await supabase
        .from("toko")
        .update({ nama_toko })
        .eq("id", id);
      if (error) throw error;
      const idx = toko.value.findIndex((t) => t.id === id);
      if (idx !== -1) toko.value[idx].nama_toko = nama_toko;
    } catch (error) {
      throw error;
    }
  };

  // Delete toko (soft delete)
  const deleteToko = async (id: string) => {
    try {
      const { error } = await supabase
        .from("toko")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toko.value = toko.value.filter((t) => t.id !== id);
    } catch (error) {
      throw error;
    }
  };

  // Create admin account
  // Note: this requires Supabase Auth API; you'll need to call a backend function
  // For now, we'll assume the admin account is already created in Auth, and we just add to user_profiles
  const linkAdminToToko = async (
    userId: string,
    tokoId: string,
    nama: string
  ) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          id_toko: tokoId,
          role: "admin",
          nama: nama,
        });
      if (error) throw error;
      await fetchAdminAccounts();
    } catch (error) {
      throw error;
    }
  };

  // Delete admin account (soft delete)
  const deleteAdminAccount = async (userId: string) => {
    try {
      // Soft delete from user_profiles
      const { error } = await supabase
        .from("user_profiles")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", userId)
        .eq("role", "admin");
      if (error) throw error;
      adminAccounts.value = adminAccounts.value.filter((a) => a.id !== userId);
    } catch (error) {
      throw error;
    }
  };

  return {
    toko,
    adminAccounts,
    loading,
    fetchToko,
    fetchAdminAccounts,
    createToko,
    updateToko,
    deleteToko,
    linkAdminToToko,
    deleteAdminAccount,
  };
});
