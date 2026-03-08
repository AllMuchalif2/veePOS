import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { type Produk } from "../stores/posStore";
import { useImageUpload } from "./useImageUpload";
import { swalSuccess, swalError, swalConfirm } from "./useSwal";

export interface KategoriItem {
  id: string;
  nama: string;
}

export function useAdminMenuTab(onRefresh: () => void) {
  const { uploadImage, isUploading, uploadError } = useImageUpload();

  const showModal = ref(false);
  const showDetailModal = ref(false);
  const isEditing = ref(false);
  const editingId = ref<string | null>(null);
  const viewingProduct = ref<Produk | null>(null);
  const selectedFile = ref<File | null>(null);
  const kategoriList = ref<KategoriItem[]>([]);

  const newProduct = ref<{
    nama: string;
    harga: number;
    foto_url: string | null;
    id_kategori: string | null;
  }>({ nama: "", harga: 0, foto_url: null, id_kategori: null });

  const loadKategori = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id_toko")
        .eq("id", userData.user?.id)
        .single();

      if (!profile?.id_toko) return;

      const { data } = await supabase
        .from("kategori")
        .select("id, nama")
        .eq("id_toko", profile.id_toko)
        .is("deleted_at", null)
        .order("nama");

      kategoriList.value = data || [];
    } catch (error) {
      console.error("Error load kategori", error);
    }
  };

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile.value = target.files[0];
    }
  };

  const openCreateModal = () => {
    isEditing.value = false;
    editingId.value = null;
    newProduct.value = {
      nama: "",
      harga: 0,
      foto_url: null,
      id_kategori: null,
    };
    selectedFile.value = null;
    showModal.value = true;
  };

  const openEditModal = (p: Produk) => {
    isEditing.value = true;
    editingId.value = p.id;
    newProduct.value = {
      nama: p.nama,
      harga: p.harga,
      foto_url: p.foto_url,
      id_kategori: p.id_kategori,
    };
    selectedFile.value = null;
    showModal.value = true;
  };

  const openDetailModal = (p: Produk) => {
    viewingProduct.value = p;
    showDetailModal.value = true;
  };

  const closeModal = () => {
    showModal.value = false;
    selectedFile.value = null;
    newProduct.value = {
      nama: "",
      harga: 0,
      foto_url: null,
      id_kategori: null,
    };
    editingId.value = null;
    isEditing.value = false;
  };

  const saveProduct = async () => {
    try {
      let fotoUrl = newProduct.value.foto_url;

      if (selectedFile.value) {
        const url = await uploadImage(selectedFile.value);
        if (url) fotoUrl = url;
        if (uploadError.value) throw new Error(uploadError.value);
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id_toko")
        .eq("id", userData.user?.id)
        .single();

      if (isEditing.value && editingId.value) {
        const { error } = await supabase
          .from("menu")
          .update({
            id_kategori: newProduct.value.id_kategori,
            nama: newProduct.value.nama,
            harga: newProduct.value.harga,
            foto_url: fotoUrl,
          })
          .eq("id", editingId.value);
        if (error) throw error;
        await swalSuccess("Berhasil", "Menu berhasil diperbarui");
      } else {
        const { error } = await supabase.from("menu").insert({
          id_toko: profile?.id_toko,
          id_kategori: newProduct.value.id_kategori,
          nama: newProduct.value.nama,
          harga: newProduct.value.harga,
          foto_url: fotoUrl,
        });
        if (error) throw error;
        await swalSuccess("Berhasil", "Menu berhasil ditambahkan");
      }

      closeModal();
      onRefresh();
    } catch (err: any) {
      await swalError("Kesalahan", err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    const ok = await swalConfirm(
      "Hapus menu ini?",
      "Menu akan dihapus dari daftar. Tidak memengaruhi riwayat pesanan yang sudah ada.",
    );
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("menu")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await swalSuccess("Berhasil", "Menu dihapus");
      onRefresh();
    } catch (err: any) {
      await swalError("Kesalahan", err.message);
    }
  };

  const getKategoriName = (id: string | null) => {
    if (!id) return "-";
    return kategoriList.value.find((k) => k.id === id)?.nama || "-";
  };

  onMounted(() => {
    loadKategori();
  });

  return {
    showModal,
    showDetailModal,
    isEditing,
    editingId,
    viewingProduct,
    selectedFile,
    newProduct,
    kategoriList,
    isUploading,
    handleFileChange,
    openCreateModal,
    openEditModal,
    openDetailModal,
    closeModal,
    saveProduct,
    deleteProduct,
    getKategoriName,
  };
}
