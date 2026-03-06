<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../supabaseClient";
import { swalSuccess, swalError } from "../../composables/useSwal";

interface Toko {
  id: string;
  nama_toko: string;
}

const tokoData = ref<Toko | null>(null);
const loading = ref(true);
const isSaving = ref(false);

const form = ref({
  nama_toko: "",
});

const loadToko = async () => {
  loading.value = true;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id_toko")
      .eq("id", userData.user?.id)
      .single();

    if (!profile?.id_toko) throw new Error("Profil toko tidak ditemukan");

    const { data, error } = await supabase
      .from("toko")
      .select("id, nama_toko")
      .eq("id", profile.id_toko)
      .single();

    if (error) throw error;

    tokoData.value = data;
    form.value.nama_toko = data.nama_toko;
  } catch (err: any) {
    await swalError("Error memuat toko", err.message);
  } finally {
    loading.value = false;
  }
};

const savePengaturan = async () => {
  if (!tokoData.value || !form.value.nama_toko.trim()) return;

  isSaving.value = true;
  try {
    const { error } = await supabase
      .from("toko")
      .update({ nama_toko: form.value.nama_toko })
      .eq("id", tokoData.value.id);

    if (error) throw error;

    await swalSuccess("Berhasil", "Info toko sudah diperbarui");
    await loadToko();
  } catch (err: any) {
    await swalError("Gagal menyimpan", err.message);
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadToko();
});
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div class="mb-4">
      <h2 class="text-xl font-bold text-gray-800">Pengaturan Toko</h2>
      <p class="text-sm text-gray-500 mt-1">
        Ubah identitas dan preferensi dasar toko Anda.
      </p>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
    >
      <form @submit.prevent="savePengaturan" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2"
            >Nama Toko</label
          >
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
            >
              <i class="bx bx-store-alt text-gray-400 text-lg"></i>
            </div>
            <input
              v-model="form.nama_toko"
              type="text"
              required
              class="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none transition text-gray-800 font-medium"
            />
          </div>
          <p class="mt-2 text-xs text-gray-500">
            Nama toko Anda akan terlihat pada nota pembelian pelanggan.
          </p>
        </div>

        <div class="pt-4 border-t border-gray-100">
          <button
            type="submit"
            :disabled="isSaving"
            class="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-[#c99188] text-white rounded-xl transition font-medium flex justify-center items-center shadow-sm"
          >
            <i v-if="isSaving" class="bx bx-loader-alt bx-spin mr-2"></i>
            <i v-else class="bx bx-save mr-2"></i>
            {{ isSaving ? "Menyimpan..." : "Simpan Perubahan" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
