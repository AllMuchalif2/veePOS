<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useSuperadminStore } from "../stores/superadminStore";
import DashboardTab from "../components/DashboardTab.vue";
import TokoTab from "../components/TokoTab.vue";
import AdminTab from "../components/AdminTab.vue";
import { useSuperAdminTokoManagement } from "../composables/useSuperAdminTokoManagement";
import { useSuperAdminAdminManagement } from "../composables/useSuperAdminAdminManagement";

const auth = useAuthStore();
const router = useRouter();
const adminStore = useSuperadminStore();
const toko = useSuperAdminTokoManagement();
const admin = useSuperAdminAdminManagement();

const activeTab = ref<"dashboard" | "toko" | "admin">("dashboard");

const logout = async () => {
  await auth.logout();
  router.push({ name: "Login" });
};

onMounted(async () => {
  try {
    await Promise.all([
      adminStore.fetchToko(),
      adminStore.fetchAdminAccounts(),
    ]);
  } catch (error) {
    // silent
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <header class="bg-white shadow sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 class="text-3xl font-bold text-slate-900">Super Admin</h1>
        <button
          @click="logout"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- Tabs Navigation -->
    <div class="border-b border-slate-200 bg-white sticky top-16 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
        <button
          @click="activeTab = 'dashboard'"
          :class="[
            'py-4 px-2 font-medium border-b-2 transition',
            activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          ]"
        >
          Dashboard
        </button>
        <button
          @click="activeTab = 'toko'"
          :class="[
            'py-4 px-2 font-medium border-b-2 transition',
            activeTab === 'toko'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          ]"
        >
          Kelola Toko
        </button>
        <button
          @click="activeTab = 'admin'"
          :class="[
            'py-4 px-2 font-medium border-b-2 transition',
            activeTab === 'admin'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          ]"
        >
          Admin Account
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardTab
        v-if="activeTab === 'dashboard'"
        :toko-count="adminStore.toko.length"
        :admin-count="adminStore.adminAccounts.length"
        @add-store="() => toko.openCreate()"
        @add-admin="() => admin.openCreate(adminStore.toko[0]?.id || '')"
      />
      <TokoTab
        v-if="activeTab === 'toko'"
        :toko-list="adminStore.toko"
      />
      <AdminTab
        v-if="activeTab === 'admin'"
        :admin-list="adminStore.adminAccounts"
        :toko-list="adminStore.toko"
      />
    </div>
  </div>
</template>
