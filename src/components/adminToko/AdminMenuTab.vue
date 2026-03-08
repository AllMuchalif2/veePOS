<script setup lang="ts">
import { useAdminMenuTab } from "../../composables/useAdminMenuTab";
import { type Produk } from "../../stores/posStore";

const props = defineProps<{ products: Produk[] }>();
const emit = defineEmits<{ (e: "refresh"): void }>();

const p = useAdminMenuTab(() => emit("refresh"));
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">
        Manajemen Menu Makanan &amp; Minuman
      </h2>
      <button
        @click="p.openCreateModal()"
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
        v-for="prod in products"
        :key="prod.id"
        class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group"
      >
        <div
          class="h-40 w-full rounded-xl bg-gray-100 mb-4 overflow-hidden relative"
        >
          <img
            v-if="prod.foto_url"
            :src="prod.foto_url"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <i
            v-else
            class="bx bx-image text-gray-300 text-5xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          ></i>
        </div>
        <h3 class="font-bold text-gray-800 line-clamp-2 leading-tight">
          {{ prod.nama }}
        </h3>
        <p class="text-primary font-medium mt-1">
          Rp {{ prod.harga.toLocaleString("id-ID") }}
        </p>
        <div class="mt-auto pt-4 flex gap-2">
          <button
            @click="p.openDetailModal(prod)"
            class="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
          >
            Detail
          </button>
          <button
            @click="p.openEditModal(prod)"
            class="flex-1 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition text-sm font-medium"
          >
            Edit
          </button>
          <button
            @click="p.deleteProduct(prod.id)"
            class="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="p.showModal.value"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-800">
            {{ p.isEditing.value ? "Edit Menu" : "Tambah Menu Baru" }}
          </h2>
          <button
            @click="p.closeModal()"
            class="text-gray-400 hover:text-gray-600"
          >
            <i class="bx bx-x text-2xl"></i>
          </button>
        </div>

        <form @submit.prevent="p.saveProduct()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Nama Menu</label
            >
            <input
              v-model="p.newProduct.value.nama"
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
              v-model="p.newProduct.value.id_kategori"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition bg-white"
            >
              <option :value="null">Pilih Kategori (Opsional)</option>
              <option
                v-for="k in p.kategoriList.value"
                :key="k.id"
                :value="k.id"
              >
                {{ k.nama }}
              </option>
            </select>
            <p
              v-if="p.kategoriList.value.length === 0"
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
              v-model.number="p.newProduct.value.harga"
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
                p.isEditing.value && p.newProduct.value.foto_url
                  ? "(Biarkan kosong jika tidak ingin mengubah)"
                  : ""
              }}
            </label>
            <div
              v-if="
                p.isEditing.value &&
                p.newProduct.value.foto_url &&
                !p.selectedFile.value
              "
              class="mb-2 h-24 w-24 rounded-lg overflow-hidden border"
            >
              <img
                :src="p.newProduct.value.foto_url"
                class="w-full h-full object-cover"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              @change="p.handleFileChange"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>
          <div class="pt-4 flex gap-3">
            <button
              type="button"
              @click="p.closeModal()"
              class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="p.isUploading.value"
              class="flex-1 py-3 bg-primary hover:bg-[#c99188] text-white rounded-xl transition font-medium flex justify-center items-center"
            >
              <i
                v-if="p.isUploading.value"
                class="bx bx-loader-alt bx-spin mr-2"
              ></i>
              {{ p.isUploading.value ? "Menyimpan..." : "Simpan" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="p.showDetailModal.value && p.viewingProduct.value"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div class="h-48 w-full bg-gray-100 relative">
          <img
            v-if="p.viewingProduct.value.foto_url"
            :src="p.viewingProduct.value.foto_url"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <i class="bx bx-image text-gray-400 text-6xl"></i>
          </div>
          <button
            @click="p.showDetailModal.value = false"
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
              {{ p.getKategoriName(p.viewingProduct.value.id_kategori) }}
            </span>
            <h2 class="text-2xl font-bold text-gray-800 mb-1">
              {{ p.viewingProduct.value.nama }}
            </h2>
            <p class="text-2xl font-bold text-primary">
              Rp {{ p.viewingProduct.value.harga.toLocaleString("id-ID") }}
            </p>
          </div>
          <div class="pt-6 border-t border-gray-100 mt-6 flex gap-3">
            <button
              @click="
                p.showDetailModal.value = false;
                p.openEditModal(p.viewingProduct.value!);
              "
              class="flex-1 py-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition font-medium"
            >
              Edit Menu
            </button>
            <button
              @click="p.showDetailModal.value = false"
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
