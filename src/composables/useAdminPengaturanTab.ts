import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalSuccess, swalError } from "./useSwal";

export interface TokoData {
  id: string;
  nama_toko: string;
}

export function useAdminPengaturanTab() {
  const tokoData = ref<TokoData | null>(null);
  const loading = ref(true);
  const isSaving = ref(false);
  const form = ref({ nama_toko: "" });

  const loadToko = async () => {
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
        .from("toko")
        .select("id, nama_toko")
        .eq("id", profile.id_toko)
        .single();

      if (error) throw error;

      tokoData.value = data;
      form.value.nama_toko = data.nama_toko;
    } catch (err: any) {
      await swalError("Error memuat toko", err.message);
    } finally {
      loading.value = false;
    }
  };

  const savePengaturan = async () => {
    if (!tokoData.value || !form.value.nama_toko.trim()) return;
    isSaving.value = true;

    try {
      const { error } = await supabase
        .from("toko")
        .update({ nama_toko: form.value.nama_toko })
        .eq("id", tokoData.value.id);

      if (error) throw error;
      await swalSuccess("Berhasil", "Info toko sudah diperbarui");
      await loadToko();
    } catch (err: any) {
      await swalError("Gagal menyimpan", err.message);
    } finally {
      isSaving.value = false;
    }
  };

  onMounted(() => {
    loadToko();
  });

  return {
    tokoData,
    loading,
    isSaving,
    form,
    savePengaturan,
  };
}
