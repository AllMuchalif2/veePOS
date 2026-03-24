import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalSuccess, swalError, swalConfirm } from "./useSwal";
import QRCode from "qrcode";
import { slugify } from "./useSlugify";
import { useAuthStore } from "../stores/authStore";

export interface Meja {
  id: string;
  nomor_meja: string;
  slug: string;
  status?: string;
}

export function useAdminMejaTab() {
  const mejaList = ref<Meja[]>([]);
  const loading = ref(true);
  const showModal = ref(false);
  const isEditing = ref(false);
  const formLoading = ref(false);
  const form = ref({ id: "", nomor_meja: "", status: "tersedia" });

  const namaToko = ref("");
  const tokoSlug = ref("");
  const idToko = ref("");
  const showQrModal = ref(false);
  const qrMeja = ref<Meja | null>(null);
  const qrDataUrl = ref("");

  const loadNamaToko = async () => {
    try {
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;
      if (!tokoId) return;
      idToko.value = tokoId;
      const { data: toko } = await supabase
        .from("toko")
        .select("nama_toko, slug")
        .eq("id", tokoId)
        .single();
      if (toko) {
        namaToko.value = toko.nama_toko;
        tokoSlug.value = toko.slug;
      }
    } catch (e) {
      console.error("load toko error", e);
    }
  };

  const loadMeja = async () => {
    loading.value = true;
    try {
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;

      if (!tokoId) throw new Error("Profil toko tidak ditemukan");

      const { data, error } = await supabase
        .from("meja")
        .select("*")
        .eq("id_toko", tokoId)
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
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;

      if (isEditing.value) {
        const { error } = await supabase
          .from("meja")
          .update({
            nomor_meja: form.value.nomor_meja,
            slug: slugify(form.value.nomor_meja),
            status: form.value.status,
          })
          .eq("id", form.value.id);
        if (error) throw error;
        await swalSuccess("Berhasil", "Data meja diperbarui");
      } else {
        const { error } = await supabase.from("meja").insert({
          id_toko: tokoId,
          nomor_meja: form.value.nomor_meja,
          slug: slugify(form.value.nomor_meja),
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

  const openQrModal = async (meja: Meja) => {
    qrMeja.value = meja;
    const url = `${window.location.origin}/menu/${tokoSlug.value}/${meja.slug}`;
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    });
    showQrModal.value = true;
  };

  const printQr = () => {
    const win = window.open("", "_blank", "width=400,height=550");
    if (!win || !qrMeja.value) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Meja ${qrMeja.value.nomor_meja}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
          .card { text-align: center; padding: 32px 24px; border: 2px dashed #e2e8f0; border-radius: 16px; width: 320px; }
          .store { font-size: 14px; color: #64748b; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px; }
          .table-name { font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 20px; }
          .qr img { width: 240px; height: 240px; }
          .hint { margin-top: 16px; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <p class="store">${namaToko.value}</p>
          <p class="table-name">${qrMeja.value.nomor_meja}</p>
          <div class="qr"><img src="${qrDataUrl.value}" /></div>
          <p class="hint">Scan untuk memesan</p>
        </div>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "tersedia" ? "terisi" : "tersedia";
    try {
      const { error } = await supabase
        .from("meja")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      // Optimistic update
      const meja = mejaList.value.find((m) => m.id === id);
      if (meja) meja.status = newStatus;
    } catch (err: any) {
      await swalError("Kesalahan", err.message);
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
    loadNamaToko();
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
    toggleStatus,
    namaToko,
    showQrModal,
    qrMeja,
    qrDataUrl,
    openQrModal,
    printQr,
  };
}
