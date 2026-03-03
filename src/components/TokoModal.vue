<script setup lang="ts">
defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
  mode: "create" | "edit";
  tokoName: string;
  tokoId?: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  updateMode: [value: "create" | "edit"];
  save: [];
  close: [];
  deleteToko: [id: string];
}>();
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
  >
    <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">
          {{ mode === "create" ? "Tambah Toko Baru" : "Ubah Toko" }}
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <i class="bx bx-x text-2xl"></i>
        </button>
      </div>

      <form @submit.prevent="$emit('save')" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Nama Toko
          </label>
          <input
            :value="tokoName"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            type="text"
            required
            placeholder="contoh: Kopi Central"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
          />
        </div>

        <div class="pt-4 flex gap-3">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="flex-1 py-3 bg-primary hover:bg-[#c99188] text-white rounded-xl transition font-medium"
          >
            {{ mode === "create" ? "Buat" : "Ubah" }} Toko
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
