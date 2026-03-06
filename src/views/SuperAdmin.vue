<script setup lang="ts">
import DashboardTab from "../components/superAdmin/DashboardTab.vue";
import TokoTab from "../components/superAdmin/TokoTab.vue";
import AdminTab from "../components/superAdmin/AdminTab.vue";
import { useSuperAdminPresenter } from "../presenters/useSuperAdminPresenter";

const {
  adminStore,
  toko,
  admin,
  isInstallable,
  installApp,
  activeTab,
  logout,
} = useSuperAdminPresenter();
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <header class="bg-white shadow sticky top-0 z-40">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center"
      >
        <h1 class="text-3xl font-bold text-slate-900">Super Admin</h1>
        <div class="flex items-center gap-3">
          <button
            v-if="isInstallable"
            @click="installApp"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
            Install App
          </button>
          <button
            @click="logout"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition"
          >
            Logout
          </button>
        </div>
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
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-600 hover:text-slate-900',
          ]"
        >
          Dashboard
        </button>
        <button
          @click="activeTab = 'toko'"
          :class="[
            'py-4 px-2 font-medium border-b-2 transition',
            activeTab === 'toko'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-600 hover:text-slate-900',
          ]"
        >
          Kelola Toko
        </button>
        <button
          @click="activeTab = 'admin'"
          :class="[
            'py-4 px-2 font-medium border-b-2 transition',
            activeTab === 'admin'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-600 hover:text-slate-900',
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
        @add-admin="() => admin.openModal()"
      />
      <TokoTab v-if="activeTab === 'toko'" :toko-list="adminStore.toko" />
      <AdminTab
        v-if="activeTab === 'admin'"
        :admin-list="adminStore.adminAccounts"
        :toko-list="adminStore.toko"
      />
    </div>
  </div>
</template>
