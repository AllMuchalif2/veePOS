<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabaseClient";

const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const handleLogin = async () => {
  try {
    loading.value = true;
    errorMsg.value = "";

    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    // Redirect to POS Kasir view on success
    router.push("/");
  } catch (error: any) {
    errorMsg.value = error.message || "Login failed";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-base flex justify-center items-center p-4 font-sans"
  >
    <div
      class="w-full max-w-md bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4"
        >
          <i class="bx bx-coffee text-3xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">Welcome Back</h1>
        <p class="text-sm text-gray-500 mt-2">Sign in to your POS Dashboard</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Email</label
          >
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <i class="bx bx-envelope text-gray-400 text-lg"></i>
            </div>
            <input
              v-model="email"
              type="email"
              required
              class="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-gray-400"
              placeholder="admin@cafe.com"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Password</label
          >
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <i class="bx bx-lock-alt text-gray-400 text-lg"></i>
            </div>
            <input
              v-model="password"
              type="password"
              required
              class="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div
          v-if="errorMsg"
          class="p-3 rounded-lg bg-red-50 text-red-600 text-sm py-2"
        >
          <i class="bx bx-error-circle align-middle mr-1"></i>
          <span class="align-middle">{{ errorMsg }}</span>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-primary hover:bg-[#c99188] text-white font-medium py-3 rounded-xl transition-colors duration-200 flex justify-center items-center shadow-md shadow-primary/20"
        >
          <i v-if="loading" class="bx bx-loader-alt bx-spin text-xl mr-2"></i>
          {{ loading ? "Signing in..." : "Sign In" }}
        </button>
      </form>
    </div>
  </div>
</template>
