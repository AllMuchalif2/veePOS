import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalSuccess, swalError, swalConfirm } from "./useSwal";

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
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id_toko")
        .eq("id", userData.user?.id)
        .single();

      if (!profile?.id_toko) throw new Error("Profil toko tidak ditemukan");

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, nama, email, created_at")
        .eq("id_toko", profile.id_toko)
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
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id_toko")
        .eq("id", userData.user?.id)
        .single();

      if (!profile?.id_toko) throw new Error("Anda tidak memiliki akses toko.");

      const { getSupabaseAdmin } = await import("../supabaseAdmin");
      const supabaseAdmin = getSupabaseAdmin();

      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: form.value.email,
          password: form.value.password,
          email_confirm: true,
        });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Gagal membuat user");

      await new Promise((resolve) => setTimeout(resolve, 500));

      const { error: linkError } = await supabase.from("user_profiles").insert({
        id: authData.user.id,
        id_toko: profile.id_toko,
        role: "kasir",
        nama: form.value.nama,
        email: form.value.email,
      });

      if (linkError) throw linkError;

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
