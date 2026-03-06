<script setup lang="ts">
interface AdminFormData {
  email: string;
  password: string;
  nama: string;
  tokoId: string;
}

defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
  form: AdminFormData;
  tokoList: Array<{ id: string; nama_toko: string }>;
}>();

defineEmits<{
  updateForm: [key: keyof AdminFormData, value: string];
  save: [];
  close: [];
}>();
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
  >
    <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">Buat Akun Admin</h2>
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
            Toko
          </label>
          <select
            :value="form.tokoId"
            @change="$emit('updateForm', 'tokoId', ($event.target as HTMLSelectElement).value)"
            required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
          >
            <option value="">Pilih toko</option>
            <option v-for="t in tokoList" :key="t.id" :value="t.id">
              {{ t.nama_toko }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Nama
          </label>
          <input
            :value="form.nama"
            @input="$emit('updateForm', 'nama', ($event.target as HTMLInputElement).value)"
            type="text"
            required
            placeholder="Nama admin"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            :value="form.email"
            @input="$emit('updateForm', 'email', ($event.target as HTMLInputElement).value)"
            type="email"
            required
            placeholder="admin@toko.com"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            :value="form.password"
            @input="$emit('updateForm', 'password', ($event.target as HTMLInputElement).value)"
            type="password"
            required
            placeholder="••••••••"
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
            class="flex-1 py-3 bg-primary hover:bg-[#c99188] text-white rounded-xl transition font-medium flex justify-center items-center"
          >
            <i v-if="isLoading" class="bx bx-loader-alt bx-spin mr-2"></i>
            {{ isLoading ? "Membuat..." : "Buat Akun" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
