<script setup lang="ts">
defineProps<{
  tokoCount: number;
  adminCount: number;
  onAddStore: () => void;
  onAddAdmin: () => void;
}>();
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Total Toko</p>
            <h3 class="text-3xl font-bold text-gray-800 mt-2">{{ tokoCount }}</h3>
          </div>
          <div class="bg-primary/10 p-4 rounded-full">
            <i class="bx bx-store text-3xl text-primary"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Total Admin</p>
            <h3 class="text-3xl font-bold text-gray-800 mt-2">{{ adminCount }}</h3>
          </div>
          <div class="bg-primary/10 p-4 rounded-full">
            <i class="bx bx-user-check text-3xl text-primary"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Status Sistem</p>
            <div class="flex items-center mt-2">
              <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <p class="text-xl font-bold text-green-600">Aktif</p>
            </div>
          </div>
          <div class="bg-green-100 p-4 rounded-full">
            <i class="bx bx-check-circle text-3xl text-green-600"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 class="text-lg font-bold text-gray-800 mb-4">Aksi Cepat</h3>
      <div class="flex gap-3">
        <button
          @click="onAddStore"
          class="bg-primary text-white px-6 py-3 rounded-xl hover:bg-[#c99188] transition shadow"
        >
          <i class="bx bx-plus mr-1"></i> Tambah Toko
        </button>
        <button
          @click="onAddAdmin"
          class="bg-secondary text-gray-800 px-6 py-3 rounded-xl hover:bg-[#c2aa96] transition shadow"
        >
          <i class="bx bx-user-plus mr-1"></i> Buat Akun Admin
        </button>
      </div>
    </div>
  </div>
</template>
