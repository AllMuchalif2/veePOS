<script setup lang="ts">
import AdminModal from "./AdminModal.vue";
import { useSuperAdminAdminManagement } from "../composables/useSuperAdminAdminManagement";

const admin = useSuperAdminAdminManagement();

const handleFormUpdate = (
  key: keyof typeof admin.form.value,
  value: string
) => {
  admin.form.value[key] = value;
};

const handleDelete = async (id: string) => {
  await admin.delete(id);
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">Akun Administrator</h2>
      <button
        @click="admin.openModal()"
        class="bg-primary text-white px-4 py-2 rounded-xl hover:bg-[#c99188] transition shadow"
      >
        <i class="bx bx-user-plus mr-1"></i> Buat Admin
      </button>
    </div>

    <div v-if="admin.loading" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="admin.accounts.length > 0" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Nama
              </th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Toko
              </th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Dibuat
              </th>
              <th class="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="a in admin.accounts"
              :key="a.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition"
            >
              <td class="px-6 py-4 text-sm font-medium text-gray-800">
                {{ a.nama }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ a.toko_nama }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ new Date(a.created_at).toLocaleDateString("id-ID") }}
              </td>
              <td class="px-6 py-4 text-center">
                <button
                  @click="handleDelete(a.id)"
                  class="inline-block py-1 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                >
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center p-12">
        <i class="bx bx-user-check text-5xl text-gray-300 mb-3 block"></i>
        <h3 class="text-gray-500 font-medium">Tidak ada akun admin</h3>
        <p class="text-gray-400 text-sm mt-1">
          Klik 'Buat Admin' untuk menambahkan
        </p>
      </div>
    </div>

    <AdminModal
      :is-open="admin.showModal.value"
      :is-loading="admin.isCreating.value"
      :form="admin.form.value"
      :toko-list="admin.tokoList"
      @update-form="handleFormUpdate"
      @save="admin.save()"
      @close="admin.closeModal()"
    />
  </div>
</template>
