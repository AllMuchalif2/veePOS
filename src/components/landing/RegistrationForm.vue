<template>
  <section
    id="register"
    class="py-20 lg:py-32 relative overflow-hidden bg-base"
  >
    <div
      class="absolute inset-0 bg-primary transform -skew-y-3 origin-top-left -z-10 opacity-20"
    ></div>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        class="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-secondary"
      >
        <!-- Info Side -->
        <div
          class="bg-secondary bg-opacity-20 p-10 md:w-2/5 flex flex-col justify-center border-r border-secondary"
        >
          <h3 class="text-2xl font-bold text-gray-900 mb-4">Daftar Sekarang</h3>
          <p class="text-gray-600 mb-8">
            Bergabunglah dengan veePOS dan mulai kelola cafe/resto Anda lebih
            rapi.
          </p>

          <ul class="space-y-4">
            <li class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-primary mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span class="text-sm text-gray-700">Akses semua modul kasir</span>
            </li>
            <li class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-primary mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span class="text-sm text-gray-700">Manajemen multi-cabang</span>
            </li>
            <li class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-primary mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span class="text-sm text-gray-700">Scan QR Menu Meja</span>
            </li>
          </ul>
        </div>

        <!-- Form Side -->
        <div class="p-10 md:w-3/5 bg-white">
          <form @submit.prevent="submitRegistration" class="space-y-5">
            <div
              v-if="errorMsg"
              class="p-4 bg-danger/10 text-danger rounded-xl mb-4 text-sm font-medium border border-danger/20"
            >
              {{ errorMsg }}
            </div>
            <div
              v-if="successMsg"
              class="p-4 bg-success/10 text-success rounded-xl mb-4 text-sm font-medium border border-success/20"
            >
              {{ successMsg }}
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Nama Toko/Cafe</label
              >
              <input
                type="text"
                v-model="form.storeName"
                required
                placeholder="Kopi Senang"
                class="w-full px-4 py-2.5 rounded-xl border border-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-base focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Email Anda</label
              >
              <input
                type="email"
                v-model="form.email"
                required
                placeholder="owner@kopisenang.com"
                class="w-full px-4 py-2.5 rounded-xl border border-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-base focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Nomor WhatsApp</label
              >
              <input
                type="tel"
                v-model="form.phone"
                required
                placeholder="081234567890"
                class="w-full px-4 py-2.5 rounded-xl border border-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-base focus:bg-white"
              />
            </div>

            <div>
              <div ref="captchaRef" class="min-h-16"></div>
              <p v-if="captchaError" class="mt-1 text-xs text-danger">
                {{ captchaError }}
              </p>
            </div>

            <button
              type="submit"
              :disabled="isSubmitting || !captchaToken"
              class="w-full bg-primary hover-bg-primary text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              <svg
                v-if="isSubmitting"
                class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {{ isSubmitting ? "Memproses..." : "Kirim Pendaftaran" }}
            </button>
            <p class="text-xs text-center text-gray-500 mt-4">
              Tim sales kami akan segera menghubungi Anda.
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../supabaseClient";

const form = ref({
  storeName: "",
  email: "",
  phone: "",
});

const isSubmitting = ref(false);
const successMsg = ref("");
const errorMsg = ref("");
const captchaRef = ref<HTMLElement | null>(null);
const captchaToken = ref("");
const captchaError = ref("");
const turnstileWidgetId = ref<string | null>(null);

const renderCaptcha = () => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    captchaError.value = "Captcha key belum dikonfigurasi.";
    return;
  }

  if (!captchaRef.value || !window.turnstile || turnstileWidgetId.value) return;

  turnstileWidgetId.value = window.turnstile.render(captchaRef.value, {
    sitekey: siteKey,
    theme: "light",
    callback: (token: string) => {
      captchaToken.value = token;
      captchaError.value = "";
    },
    "expired-callback": () => {
      captchaToken.value = "";
      captchaError.value = "Captcha kedaluwarsa. Silakan verifikasi ulang.";
    },
    "error-callback": () => {
      captchaToken.value = "";
      captchaError.value = "Captcha gagal dimuat. Coba refresh halaman.";
    },
  });
};

onMounted(() => {
  const tryRender = () => {
    renderCaptcha();
    if (!turnstileWidgetId.value) {
      setTimeout(tryRender, 250);
    }
  };
  tryRender();
});

const submitRegistration = async () => {
  if (!form.value.storeName || !form.value.email || !form.value.phone) return;
  if (!captchaToken.value) {
    captchaError.value = "Silakan selesaikan captcha terlebih dahulu.";
    return;
  }

  isSubmitting.value = true;
  successMsg.value = "";
  errorMsg.value = "";

  try {
    const normalizedStoreName = form.value.storeName.trim();
    const normalizedEmail = form.value.email.trim().toLowerCase();
    const normalizedPhone = form.value.phone.trim();

    const { error } = await supabase.functions.invoke(
      "submit-tenant-registration",
      {
        body: {
          storeName: normalizedStoreName,
          email: normalizedEmail,
          phone: normalizedPhone,
          captchaToken: captchaToken.value,
        },
      },
    );

    if (error) {
      console.error("Gagal mendaftar:", error);
      const message = (error.message || "").toLowerCase();

      if (message.includes("pending") || message.includes("sudah")) {
        errorMsg.value =
          "Email atau nomor ini masih dalam antrean verifikasi. Mohon tunggu proses sebelumnya.";
      } else if (message.includes("terlalu banyak") || message.includes("lalu lintas")) {
        errorMsg.value =
          "Pendaftaran dibatasi untuk mencegah spam. Coba lagi beberapa saat.";
      } else if (message.includes("captcha")) {
        errorMsg.value = "Verifikasi captcha gagal. Silakan coba lagi.";
      } else {
        errorMsg.value = "Terjadi kesalahan saat pendaftaran. Silakan coba lagi.";
      }
      return;
    }

    successMsg.value =
      "Hore! Pendaftaran Anda berhasil. Tim kami akan segera menghubungi Anda melalui WhatsApp/Email.";
    form.value = { storeName: "", email: "", phone: "" };
    captchaToken.value = "";
    captchaError.value = "";
    if (window.turnstile && turnstileWidgetId.value) {
      window.turnstile.reset(turnstileWidgetId.value);
    }
  } catch (err: any) {
    errorMsg.value = err.message || "Terjadi kesalahan sistem";
  } finally {
    isSubmitting.value = false;
  }
};
</script>
