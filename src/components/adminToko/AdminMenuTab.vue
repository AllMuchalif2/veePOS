<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../supabaseClient";
import { type Produk } from "../../stores/posStore";
import { useImageUpload } from "../../composables/useImageUpload";
import { swalSuccess, swalError, swalConfirm } from "../../composables/useSwal";

const { uploadImage, isUploading, uploadError } = useImageUpload();

const props = defineProps<{
  products: Produk[];
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const showModal = ref(false);
const newProduct = ref<{
  nama: string;
  harga: number;
  foto_url: string | null;
  id_kategori: string | null;
}>({
  nama: "",
  harga: 0,
  foto_url: null,
  id_kategori: null,
});
const selectedFile = ref<File | null>(null);

interface Kategori {
  id: string;
  nama: string;
}
const kategoriList = ref<Kategori[]>([]);

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
        .from("produk")
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
      const { error } = await supabase.from("produk").insert({
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
    emit("refresh"); // trigger parent to reload products
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
      .from("produk")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await swalSuccess("Berhasil", "Menu dihapus");
    emit("refresh");
  } catch (err: any) {
    await swalError("Kesalahan", err.message);
  }
};

const isEditing = ref(false);
const editingId = ref<string | null>(null);

const openCreateModal = () => {
  isEditing.value = false;
  editingId.value = null;
  newProduct.value = { nama: "", harga: 0, foto_url: null, id_kategori: null };
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

const closeModal = () => {
  showModal.value = false;
  selectedFile.value = null;
  newProduct.value = { nama: "", harga: 0, foto_url: null, id_kategori: null };
  editingId.value = null;
  isEditing.value = false;
};

// View Details
const showDetailModal = ref(false);
const viewingProduct = ref<Produk | null>(null);

const openDetailModal = (p: Produk) => {
  viewingProduct.value = p;
  showDetailModal.value = true;
};

const getKategoriName = (id: string | null) => {
  if (!id) return "-";
  return kategoriList.value.find((k) => k.id === id)?.nama || "-";
};

onMounted(() => {
  loadKategori();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">
        Manajemen Menu Makanan & Minuman
      </h2>
      <button
        @click="openCreateModal"
        class="bg-primary text-white px-4 py-2 rounded-xl hover:bg-[#c99188] transition shadow"
      >
        <i class="bx bx-plus mr-1"></i> Tambah Menu
      </button>
    </div>

    <div
      v-if="products.length === 0"
      class="text-center p-12 bg-white rounded-2xl border border-gray-100"
    >
      <i class="bx bx-food-menu text-5xl text-gray-300 mb-3 block"></i>
      <h3 class="text-gray-500 font-medium">Belum ada menu</h3>
      <p class="text-gray-400 text-sm mt-1">
        Klik 'Tambah Menu' untuk mulai berjualan
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      <div
        v-for="p in products"
        :key="p.id"
        class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group"
      >
        <div
          class="h-40 w-full rounded-xl bg-gray-100 mb-4 overflow-hidden relative"
        >
          <img
            v-if="p.foto_url"
            :src="p.foto_url"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <i
            v-else
            class="bx bx-image text-gray-300 text-5xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          ></i>
        </div>
        <h3 class="font-bold text-gray-800 line-clamp-2 leading-tight">
          {{ p.nama }}
        </h3>
        <p class="text-primary font-medium mt-1">
          Rp {{ p.harga.toLocaleString("id-ID") }}
        </p>
        <div class="mt-auto pt-4 flex gap-2">
          <button
            @click="openDetailModal(p)"
            class="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
          >
            Detail
          </button>
          <button
            @click="openEditModal(p)"
            class="flex-1 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition text-sm font-medium"
          >
            Edit
          </button>
          <button
            @click="deleteProduct(p.id)"
            class="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal Form -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-800">
            {{ isEditing ? "Edit Menu" : "Tambah Menu Baru" }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <i class="bx bx-x text-2xl"></i>
          </button>
        </div>

        <form @submit.prevent="saveProduct" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Nama Menu</label
            >
            <input
              v-model="newProduct.nama"
              type="text"
              required
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Kategori</label
            >
            <select
              v-model="newProduct.id_kategori"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition bg-white"
            >
              <option :value="null">Pilih Kategori (Opsional)</option>
              <option v-for="k in kategoriList" :key="k.id" :value="k.id">
                {{ k.nama }}
              </option>
            </select>
            <p
              v-if="kategoriList.length === 0"
              class="text-xs text-orange-500 mt-1"
            >
              Tambahkan kategori dulu di tab 'Kategori' jika ingin
              mengelompokkan menu.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Harga (Rp)</label
            >
            <input
              v-model.number="newProduct.harga"
              type="number"
              required
              min="0"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Foto Menu
              {{
                isEditing && newProduct.foto_url
                  ? "(Biarkan kosong jika tidak ingin mengubah)"
                  : ""
              }}
            </label>
            <div
              v-if="isEditing && newProduct.foto_url && !selectedFile"
              class="mb-2 h-24 w-24 rounded-lg overflow-hidden border"
            >
              <img
                :src="newProduct.foto_url"
                class="w-full h-full object-cover"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div class="pt-4 flex gap-3">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isUploading"
              class="flex-1 py-3 bg-primary hover:bg-[#c99188] text-white rounded-xl transition font-medium flex justify-center items-center"
            >
              <i v-if="isUploading" class="bx bx-loader-alt bx-spin mr-2"></i>
              {{ isUploading ? "Menyimpan..." : "Simpan" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail Modal Form -->
    <div
      v-if="showDetailModal && viewingProduct"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div class="h-48 w-full bg-gray-100 relative">
          <img
            v-if="viewingProduct.foto_url"
            :src="viewingProduct.foto_url"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <i class="bx bx-image text-gray-400 text-6xl"></i>
          </div>
          <button
            @click="showDetailModal = false"
            class="absolute top-4 right-4 bg-white/50 backdrop-blur-sm p-1.5 rounded-full text-gray-800 hover:bg-white transition"
          >
            <i class="bx bx-x text-2xl leading-none"></i>
          </button>
        </div>

        <div class="p-6">
          <div class="mb-4">
            <span
              class="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium mb-2 uppercase tracking-wider"
            >
              {{ getKategoriName(viewingProduct.id_kategori) }}
            </span>
            <h2 class="text-2xl font-bold text-gray-800 mb-1">
              {{ viewingProduct.nama }}
            </h2>
            <p class="text-2xl font-bold text-primary">
              Rp {{ viewingProduct.harga.toLocaleString("id-ID") }}
            </p>
          </div>

          <div class="pt-6 border-t border-gray-100 mt-6 flex gap-3">
            <button
              @click="
                showDetailModal = false;
                openEditModal(viewingProduct);
              "
              class="flex-1 py-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition font-medium"
            >
              Edit Menu
            </button>
            <button
              @click="showDetailModal = false"
              class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
