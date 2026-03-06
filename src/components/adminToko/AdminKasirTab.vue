<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../supabaseClient";
import { swalSuccess, swalError, swalConfirm } from "../../composables/useSwal";

interface AkunKasir {
  id: string;
  nama: string;
  email: string | null;
  created_at: string;
}

const kasirList = ref<AkunKasir[]>([]);
const loading = ref(true);
const showModal = ref(false);
const formLoading = ref(false);

const form = ref({
  nama: "",
  email: "",
  password: "",
});

const loadKasir = async () => {
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
      .from("user_profiles")
      .select("id, nama, email, created_at")
      .eq("id_toko", profile.id_toko)
      .eq("role", "kasir")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    kasirList.value = data || [];
  } catch (err: any) {
    await swalError("Error memuat kasir", err.message);
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  form.value = { nama: "", email: "", password: "" };
  showModal.value = true;
};

const saveKasir = async () => {
  if (
    !form.value.nama.trim() ||
    !form.value.email.trim() ||
    !form.value.password
  )
    return;
  formLoading.value = true;

  try {
    // 1. Get Toko ID limits to the current logged in Admin
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id_toko")
      .eq("id", userData.user?.id)
      .single();

    if (!profile?.id_toko) throw new Error("Anda tidak memiliki akses toko.");

    // 2. Get Supabase Admin Client
    const { getSupabaseAdmin } = await import("../../supabaseAdmin");
    const supabaseAdmin = getSupabaseAdmin();

    // 3. Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: form.value.email,
        password: form.value.password,
        email_confirm: true,
      });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Gagal membuat user");

    await new Promise((resolve) => setTimeout(resolve, 500)); // wait for trigger if any

    // 4. Link profile to kasir role AND the current id_toko
    const { error: linkError } = await supabase.from("user_profiles").insert({
      id: authData.user.id,
      id_toko: profile.id_toko,
      role: "kasir",
      nama: form.value.nama,
      email: form.value.email,
    });

    if (linkError) throw linkError;

    await swalSuccess("Berhasil", "Akun kasir baru berhasil dibuat");
    showModal.value = false;
    await loadKasir();
  } catch (err: any) {
    await swalError("Gagal menyimpan", err.message);
  } finally {
    formLoading.value = false;
  }
};

const deleteKasir = async (id: string) => {
  const ok = await swalConfirm(
    "Hapus akun kasir?",
    "Kasir ini tidak akan bisa login lagi.",
  );
  if (!ok) return;

  try {
    const { error } = await supabase
      .from("user_profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await swalSuccess("Berhasil", "Akun kasir dihapus");
    await loadKasir();
  } catch (err: any) {
    await swalError("Kesalahan", err.message);
  }
};

onMounted(() => {
  loadKasir();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">Manajemen Akun Kasir</h2>
      <button
        @click="openAddModal"
        class="bg-primary text-white px-4 py-2 rounded-xl hover:bg-[#c99188] transition shadow"
      >
        <i class="bx bx-user-plus mr-1"></i> Buat Akun Kasir
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
    </div>

    <div
      v-else
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <table class="w-full" v-if="kasirList.length > 0">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th
              class="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-16"
            >
              No
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Nama & Email
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Dibuat Pada
            </th>
            <th
              class="px-6 py-3 text-right text-sm font-semibold text-gray-700 w-32"
            >
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(k, i) in kasirList"
            :key="k.id"
            class="border-b border-gray-100 hover:bg-gray-50 transition"
          >
            <td class="px-6 py-4 text-sm text-gray-500">{{ i + 1 }}</td>
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-gray-800">{{ k.nama }}</div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ k.email || "-" }}
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{
                new Date(k.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }}
            </td>
            <td class="px-6 py-4 text-right">
              <button
                @click="deleteKasir(k.id)"
                class="inline-block py-1.5 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              >
                Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="text-center p-12">
        <i class="bx bx-user text-5xl text-gray-300 mb-3 block"></i>
        <h3 class="text-gray-500 font-medium">Belum ada akun kasir</h3>
        <p class="text-gray-400 text-sm mt-1">
          Klik 'Buat Akun Kasir' agar kasir bisa login
        </p>
      </div>
    </div>

    <!-- Modal Form -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-800">Buat Akun Kasir</h2>
          <button
            @click="showModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <i class="bx bx-x text-2xl"></i>
          </button>
        </div>

        <form @submit.prevent="saveKasir" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Nama Kasir</label
            >
            <input
              v-model="form.nama"
              type="text"
              required
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Email
              <span class="text-xs text-gray-500"
                >(digunakan untuk login)</span
              ></label
            >
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Password</label
            >
            <input
              v-model="form.password"
              type="password"
              required
              minlength="6"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>

          <div class="pt-4 flex gap-3">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="formLoading"
              class="flex-1 py-3 bg-primary hover:bg-[#c99188] text-white rounded-xl transition font-medium flex justify-center items-center"
            >
              <i v-if="formLoading" class="bx bx-loader-alt bx-spin mr-2"></i>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
