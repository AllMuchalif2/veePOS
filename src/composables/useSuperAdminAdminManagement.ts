import { ref } from "vue";
import { useSuperadminStore } from "../stores/superadminStore";

export interface AdminFormData {
  email: string;
  password: string;
  nama: string;
  tokoId: string;
}

export function useSuperAdminAdminManagement() {
  const adminStore = useSuperadminStore();
  
  const showModal = ref(false);
  const isCreating = ref(false);
  
  const form = ref<AdminFormData>({
    email: "",
    password: "",
    nama: "",
    tokoId: adminStore.toko[0]?.id || "",
  });

  const openModal = () => {
    form.value = {
      email: "",
      password: "",
      nama: "",
      tokoId: adminStore.toko[0]?.id || "",
    };
    showModal.value = true;
  };

  const closeModal = () => {
    showModal.value = false;
  };

  const save = async () => {
    try {
      if (!form.value.email.trim()) throw new Error("Email wajib diisi");
      if (!form.value.password) throw new Error("Password wajib diisi");
      if (!form.value.nama.trim()) throw new Error("Nama wajib diisi");
      if (!form.value.tokoId) throw new Error("Pilih toko");

      isCreating.value = true;

      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceRoleKey) {
        throw new Error(
          "Service Role Key tidak ditemukan di .env.local. Hubungi administrator."
        );
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const { data: authData, error: authError } = 
        await supabaseAdmin.auth.admin.createUser({
          email: form.value.email,
          password: form.value.password,
          email_confirm: true,
        });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Gagal membuat user");

      await new Promise((resolve) => setTimeout(resolve, 500));

      const { supabase } = await import("../supabaseClient");
      const linkResult = await supabase
        .from("user_profiles")
        .insert({
          id: authData.user.id,
          id_toko: form.value.tokoId,
          role: "admin",
          nama: form.value.nama,
        });

      if (linkResult.error) throw linkResult.error;

      try {
        await adminStore.fetchAdminAccounts();
      } catch (e) {
        // silent
      }

      closeModal();
      alert("Admin berhasil dibuat!");
    } catch (error: any) {
      alert("Kesalahan: " + (error.message || error));
    } finally {
      isCreating.value = false;
    }
  };

  const delete_ = async (id: string) => {
    if (!confirm("Hapus akun ini?")) return;
    
    try {
      await adminStore.deleteAdminAccount(id);
    } catch (error: any) {
      alert("Kesalahan: " + error.message);
    }
  };

  return {
    showModal,
    isCreating,
    form,
    accounts: adminStore.adminAccounts,
    tokoList: adminStore.toko,
    loading: adminStore.loading,
    openModal,
    closeModal,
    save,
    delete: delete_,
    fetch: () => adminStore.fetchAdminAccounts(),
  };
}
