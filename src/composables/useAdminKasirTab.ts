import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalSuccess, swalError, swalConfirm } from "./useSwal";
import { useAuthStore } from "../stores/authStore";

export interface AkunKasir {
  id: string;
  nama: string;
  email: string | null;
  created_at: string;
}

export function useAdminKasirTab() {
  const kasirList = ref<AkunKasir[]>([]);
  const loading = ref(true);
  const showModal = ref(false);
  const formLoading = ref(false);

  const form = ref({ nama: "", email: "", password: "" });

  const loadKasir = async () => {
    loading.value = true;
    try {
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;

      if (!tokoId) throw new Error("Profil toko tidak ditemukan");

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, nama, email, created_at")
        .eq("id_toko", tokoId)
        .eq("role", "kasir")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      kasirList.value = data || [];
    } catch (err: any) {
      await swalError("Error memuat kasir", err.message);
    } finally {
      loading.value = false;
    }
  };

  const openAddModal = () => {
    form.value = { nama: "", email: "", password: "" };
    showModal.value = true;
  };

  const saveKasir = async () => {
    if (
      !form.value.nama.trim() ||
      !form.value.email.trim() ||
      !form.value.password
    )
      return;
    formLoading.value = true;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi tidak valid, silakan login ulang");

      const { data, error } = await supabase.functions.invoke(
        "create-kasir-user",
        {
          body: {
            email: form.value.email,
            password: form.value.password,
            nama: form.value.nama,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Gagal membuat kasir");

      await swalSuccess("Berhasil", "Akun kasir baru berhasil dibuat");
      showModal.value = false;
      await loadKasir();
    } catch (err: any) {
      await swalError("Gagal menyimpan", err.message);
    } finally {
      formLoading.value = false;
    }
  };

  const deleteKasir = async (id: string) => {
    const ok = await swalConfirm(
      "Hapus akun kasir?",
      "Kasir ini tidak akan bisa login lagi.",
    );
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await swalSuccess("Berhasil", "Akun kasir dihapus");
      await loadKasir();
    } catch (err: any) {
      await swalError("Kesalahan", err.message);
    }
  };

  onMounted(() => {
    loadKasir();
  });

  return {
    kasirList,
    loading,
    showModal,
    formLoading,
    form,
    openAddModal,
    saveKasir,
    deleteKasir,
  };
}
