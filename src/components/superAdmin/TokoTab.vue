<script setup lang="ts">
import { useSuperadminStore } from "../../stores/superadminStore";
import TokoModal from "./TokoModal.vue";
import { useSuperAdminTokoManagement } from "../../composables/useSuperAdminTokoManagement";

const adminStore = useSuperadminStore();
const toko = useSuperAdminTokoManagement();

const handleSave = async () => {
  await toko.save();
};

const handleDelete = async (id: string) => {
  await toko.delete(id);
};

const handleModalUpdate = (value: string) => {
  toko.tokoName.value = value;
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">Kelola Toko</h2>
      <button
        @click="toko.openCreate()"
        class="bg-primary text-white px-4 py-2 rounded-xl hover:bg-[#c99188] transition shadow"
      >
        <i class="bx bx-plus mr-1"></i> Tambah Toko
      </button>
    </div>

    <div v-if="toko.loading" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="t in toko.toko"
        :key="t.id"
        class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-800">{{ t.nama_toko }}</h3>
            <p class="text-gray-500 text-sm mt-1">
              {{ new Date(t.created_at).toLocaleDateString("id-ID") }}
            </p>
          </div>
          <div class="bg-primary/10 p-3 rounded-full">
            <i class="bx bx-store text-2xl text-primary"></i>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-100 flex gap-2">
          <button
            @click="toko.openEdit(t.id)"
            class="flex-1 py-2 bg-info bg-opacity-20 text-info rounded-lg hover-bg-info hover:text-white transition text-sm font-medium"
          >
            Ubah
          </button>
          <button
            @click="handleDelete(t.id)"
            class="flex-1 py-2 bg-danger bg-opacity-20 text-danger rounded-lg hover-bg-danger hover:text-white transition text-sm font-medium"
          >
            Hapus
          </button>
        </div>
      </div>

      <div
        v-if="toko.toko.length === 0"
        class="col-span-full text-center p-12 bg-white rounded-2xl border border-gray-100"
      >
        <i class="bx bx-store text-5xl text-gray-300 mb-3"></i>
        <h3 class="text-gray-500 font-medium">Tidak ada toko</h3>
        <p class="text-gray-400 text-sm mt-1">
          Klik 'Tambah Toko' untuk membuat satu
        </p>
      </div>
    </div>

    <TokoModal
      :is-open="toko.showModal.value"
      :mode="toko.modalMode.value"
      :toko-name="toko.tokoName.value"
      :toko-id="toko.editingId.value"
      @update:model-value="handleModalUpdate"
      @save="handleSave"
      @close="toko.closeModal()"
    />
  </div>
</template>
