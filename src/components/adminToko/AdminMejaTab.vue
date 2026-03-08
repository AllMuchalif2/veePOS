<script setup lang="ts">
import { useAdminMejaTab } from "../../composables/useAdminMejaTab";

const p = useAdminMejaTab();
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">Manajemen Meja Pelanggan</h2>
      <button
        @click="p.openAddModal()"
        class="bg-primary text-white px-4 py-2 rounded-xl hover:bg-[#c99188] transition shadow"
      >
        <i class="bx bx-plus mr-1"></i> Tambah Meja
      </button>
    </div>

    <div v-if="p.loading.value" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <table class="w-full" v-if="p.mejaList.value.length > 0">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th
              class="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-16"
            >
              No
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Identitas/Nomor Meja
            </th>
            <th
              class="px-6 py-3 text-center text-sm font-semibold text-gray-700 w-32"
            >
              Status
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
            v-for="(m, i) in p.mejaList.value"
            :key="m.id"
            class="border-b border-gray-100 hover:bg-gray-50 transition"
          >
            <td class="px-6 py-4 text-sm text-gray-500">{{ i + 1 }}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-800">
              {{ m.nomor_meja }}
            </td>
            <td class="px-6 py-4 text-center">
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-semibold',
                  m.status === 'terisi'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700',
                ]"
              >
                {{ m.status === "terisi" ? "Terisi" : "Tersedia" }}
              </span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button
                @click="p.openEditModal(m)"
                class="inline-block py-1.5 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
              >
                Edit
              </button>
              <button
                @click="p.deleteMeja(m.id)"
                class="inline-block py-1.5 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              >
                Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="text-center p-12">
        <i class="bx bx-table text-5xl text-gray-300 mb-3 block"></i>
        <h3 class="text-gray-500 font-medium">Belum ada data meja</h3>
        <p class="text-gray-400 text-sm mt-1">
          Klik 'Tambah Meja' untuk menambahkan
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
            {{ p.isEditing.value ? "Edit Meja" : "Tambah Meja" }}
          </h2>
          <button
            @click="p.showModal.value = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <i class="bx bx-x text-2xl"></i>
          </button>
        </div>

        <form @submit.prevent="p.saveMeja()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Identitas/Nomor Meja</label
            >
            <input
              v-model="p.form.value.nomor_meja"
              type="text"
              required
              placeholder="Contoh: Meja 01, VIP 1"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Status</label
            >
            <select
              v-model="p.form.value.status"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition bg-white"
            >
              <option value="tersedia">Tersedia</option>
              <option value="terisi">Terisi</option>
            </select>
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
