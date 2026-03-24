import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalSuccess, swalError, swalConfirm } from "./useSwal";
import { useAuthStore } from "../stores/authStore";

export interface Kategori {
  id: string;
  nama: string;
}

export function useAdminKategoriTab() {
  const kategoriList = ref<Kategori[]>([]);
  const loading = ref(true);
  const showModal = ref(false);
  const isEditing = ref(false);
  const formLoading = ref(false);
  const form = ref({ id: "", nama: "" });

  const loadKategori = async () => {
    loading.value = true;
    try {
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;

      if (!tokoId) throw new Error("Profil toko tidak ditemukan");

      const { data, error } = await supabase
        .from("kategori")
        .select("*")
        .eq("id_toko", tokoId)
        .is("deleted_at", null)
        .order("nama");

      if (error) throw error;
      kategoriList.value = data || [];
    } catch (err: any) {
      await swalError("Error memuat kategori", err.message);
    } finally {
      loading.value = false;
    }
  };

  const openAddModal = () => {
    isEditing.value = false;
    form.value = { id: "", nama: "" };
    showModal.value = true;
  };

  const openEditModal = (kategori: Kategori) => {
    isEditing.value = true;
    form.value = { ...kategori };
    showModal.value = true;
  };

  const saveKategori = async () => {
    if (!form.value.nama.trim()) return;
    formLoading.value = true;

    try {
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;

      if (isEditing.value) {
        const { error } = await supabase
          .from("kategori")
          .update({ nama: form.value.nama })
          .eq("id", form.value.id);
        if (error) throw error;
        await swalSuccess("Berhasil", "Data kategori diperbarui");
      } else {
        const { error } = await supabase.from("kategori").insert({
          id_toko: tokoId,
          nama: form.value.nama,
        });
        if (error) throw error;
        await swalSuccess("Berhasil", "Kategori baru ditambahkan");
      }

      showModal.value = false;
      await loadKategori();
    } catch (err: any) {
      await swalError("Gagal menyimpan", err.message);
    } finally {
      formLoading.value = false;
    }
  };

  const deleteKategori = async (id: string) => {
    const ok = await swalConfirm(
      "Hapus kategori ini?",
      "Menu yang terhubung ke kategori ini mungkin kehilangan referensi.",
    );
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("kategori")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await swalSuccess("Berhasil", "Kategori dihapus");
      await loadKategori();
    } catch (err: any) {
      await swalError("Kesalahan", err.message);
    }
  };

  onMounted(() => {
    loadKategori();
  });

  return {
    kategoriList,
    loading,
    showModal,
    isEditing,
    formLoading,
    form,
    openAddModal,
    openEditModal,
    saveKategori,
    deleteKategori,
  };
}
