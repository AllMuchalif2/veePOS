import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalSuccess, swalError, swalConfirm } from "./useSwal";

export interface Meja {
  id: string;
  nomor_meja: string;
  status?: string;
}

export function useAdminMejaTab() {
  const mejaList = ref<Meja[]>([]);
  const loading = ref(true);
  const showModal = ref(false);
  const isEditing = ref(false);
  const formLoading = ref(false);
  const form = ref({ id: "", nomor_meja: "", status: "tersedia" });

  const loadMeja = async () => {
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
        .from("meja")
        .select("*")
        .eq("id_toko", profile.id_toko)
        .is("deleted_at", null)
        .order("nomor_meja");

      if (error) throw error;
      mejaList.value = data || [];
    } catch (err: any) {
      await swalError("Error memuat meja", err.message);
    } finally {
      loading.value = false;
    }
  };

  const openAddModal = () => {
    isEditing.value = false;
    form.value = { id: "", nomor_meja: "", status: "tersedia" };
    showModal.value = true;
  };

  const openEditModal = (meja: Meja) => {
    isEditing.value = true;
    form.value = { ...meja, status: meja.status || "tersedia" };
    showModal.value = true;
  };

  const saveMeja = async () => {
    if (!form.value.nomor_meja.trim()) return;
    formLoading.value = true;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id_toko")
        .eq("id", userData.user?.id)
        .single();

      if (isEditing.value) {
        const { error } = await supabase
          .from("meja")
          .update({
            nomor_meja: form.value.nomor_meja,
            status: form.value.status,
          })
          .eq("id", form.value.id);
        if (error) throw error;
        await swalSuccess("Berhasil", "Data meja diperbarui");
      } else {
        const { error } = await supabase.from("meja").insert({
          id_toko: profile?.id_toko,
          nomor_meja: form.value.nomor_meja,
          status: form.value.status,
        });
        if (error) throw error;
        await swalSuccess("Berhasil", "Meja baru ditambahkan");
      }

      showModal.value = false;
      await loadMeja();
    } catch (err: any) {
      await swalError(
        "Gagal menyimpan",
        err.message || "Pastikan nomor meja belum digunakan",
      );
    } finally {
      formLoading.value = false;
    }
  };

  const deleteMeja = async (id: string) => {
    const ok = await swalConfirm(
      "Hapus meja ini?",
      "Data tidak bisa dikembalikan.",
    );
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("meja")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await swalSuccess("Berhasil", "Meja dihapus");
      await loadMeja();
    } catch (err: any) {
      await swalError("Kesalahan", err.message);
    }
  };

  onMounted(() => {
    loadMeja();
  });

  return {
    mejaList,
    loading,
    showModal,
    isEditing,
    formLoading,
    form,
    openAddModal,
    openEditModal,
    saveMeja,
    deleteMeja,
  };
}
