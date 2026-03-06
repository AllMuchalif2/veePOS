<script setup lang="ts">
import { useAdminPresenter } from "../presenters/useAdminPresenter";
import AdminTokoDashboardTab from "../components/adminToko/AdminTokoDashboardTab.vue";
import AdminMenuTab from "../components/adminToko/AdminMenuTab.vue";
import AdminKategoriTab from "../components/adminToko/AdminKategoriTab.vue";
import AdminKasirTab from "../components/adminToko/AdminKasirTab.vue";
import AdminMejaTab from "../components/adminToko/AdminMejaTab.vue";
import AdminRiwayatTab from "../components/adminToko/AdminRiwayatTab.vue";
import AdminPengaturanTab from "../components/adminToko/AdminPengaturanTab.vue";

const {
  router,
  isInstallable,
  installApp,
  products,
  loading,
  activeTab,
  stats,
  chartData,
  logout,
  loadDashboardData,
} = useAdminPresenter();
</script>

<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 font-sans"
  >
    <!-- Header -->
    <header class="bg-white shadow sticky top-0 z-40">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center"
      >
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Admin Toko</h1>
          <p class="text-gray-500 text-sm">
            Kelola operasional kasir dan toko Anda
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="isInstallable"
            @click="installApp"
            class="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow flex items-center gap-2"
          >
            <i class="bx bx-download"></i> Install App
          </button>
          <button
            @click="router.push('/')"
            class="bg-secondary text-gray-800 px-4 py-2 rounded-xl hover:bg-[#c2aa96] transition shadow"
          >
            POS Cashier
          </button>
          <button
            @click="logout"
            class="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/80 transition shadow"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Tabs Navigation -->
    <div
      class="border-b border-slate-200 bg-white sticky top-20 z-30 shadow-sm overflow-x-auto"
    >
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 sm:gap-6 min-w-max"
      >
        <button
          v-for="tab in [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'kategori', label: 'Kategori' },
            { id: 'menu', label: 'Menu Makanan' },
            { id: 'meja', label: 'Meja' },
            { id: 'kasir', label: 'Akun Kasir' },
            { id: 'riwayat', label: 'Riwayat Pemesanan' },
            { id: 'pengaturan', label: 'Pengaturan Toko' },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-4 px-2 font-medium border-b-2 transition',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="loading" class="flex justify-center items-center h-64">
        <i class="bx bx-loader-alt bx-spin text-5xl text-primary"></i>
      </div>

      <template v-else>
        <!-- Dashboard Tab -->
        <AdminTokoDashboardTab
          v-if="activeTab === 'dashboard'"
          :stats="stats"
          :chartData="chartData"
        />

        <!-- Menu Tab -->
        <AdminMenuTab
          v-if="activeTab === 'menu'"
          :products="products"
          @refresh="loadDashboardData"
        />

        <!-- Kategori Tab -->
        <AdminKategoriTab v-if="activeTab === 'kategori'" />

        <!-- Meja Tab -->
        <AdminMejaTab v-if="activeTab === 'meja'" />

        <!-- Kasir Tab -->
        <AdminKasirTab v-if="activeTab === 'kasir'" />

        <!-- Riwayat Tab -->
        <AdminRiwayatTab v-if="activeTab === 'riwayat'" />

        <!-- Pengaturan Tab -->
        <AdminPengaturanTab v-if="activeTab === 'pengaturan'" />
      </template>
    </main>
  </div>
</template>
