<script setup lang="ts">
import { useAdminKategoriTab } from "../../composables/useAdminKategoriTab";

const p = useAdminKategoriTab();
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">Manajemen Kategori Menu</h2>
      <button
        @click="p.openAddModal()"
        class="bg-primary text-white px-4 py-2 rounded-xl hover:bg-[#c99188] transition shadow"
      >
        <i class="bx bx-plus mr-1"></i> Tambah Kategori
      </button>
    </div>

    <div v-if="p.loading.value" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <table class="w-full" v-if="p.kategoriList.value.length > 0">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th
              class="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-16"
            >
              No
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Nama Kategori
            </th>
            <th
              class="px-6 py-3 text-right text-sm font-semibold text-gray-700 w-48"
            >
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(k, i) in p.kategoriList.value"
            :key="k.id"
            class="border-b border-gray-100 hover:bg-gray-50 transition"
          >
            <td class="px-6 py-4 text-sm text-gray-500">{{ i + 1 }}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-800">
              {{ k.nama }}
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button
                @click="p.openEditModal(k)"
                class="inline-block py-1.5 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
              >
                Edit
              </button>
              <button
                @click="p.deleteKategori(k.id)"
                class="inline-block py-1.5 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              >
                Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="text-center p-12">
        <i class="bx bx-category text-5xl text-gray-300 mb-3 block"></i>
        <h3 class="text-gray-500 font-medium">Belum ada kategori</h3>
        <p class="text-gray-400 text-sm mt-1">
          Klik 'Tambah Kategori' untuk mengelompokkan menu Anda
        </p>
      </div>
    </div>

    <!-- Modal Form -->
    <div
      v-if="p.showModal.value"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-800">
            {{ p.isEditing.value ? "Edit Kategori" : "Tambah Kategori" }}
          </h2>
          <button
            @click="p.showModal.value = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <i class="bx bx-x text-2xl"></i>
          </button>
        </div>

        <form @submit.prevent="p.saveKategori()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Nama Kategori</label
            >
            <input
              v-model="p.form.value.nama"
              type="text"
              required
              placeholder="Contoh: Makanan Berat, Minuman Dingin"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
          <div class="pt-4 flex gap-3">
            <button
              type="button"
              @click="p.showModal.value = false"
              class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="p.formLoading.value"
              class="flex-1 py-3 bg-primary hover:bg-[#c99188] text-white rounded-xl transition font-medium flex justify-center items-center"
            >
              <i
                v-if="p.formLoading.value"
                class="bx bx-loader-alt bx-spin mr-2"
              ></i>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
