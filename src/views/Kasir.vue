<script setup lang="ts">
import { ref } from "vue";
import { useKasirPresenter } from "../presenters/useKasirPresenter";

const isCartMobileOpen = ref(false);

const {
  posStore,
  isInstallable,
  installApp,
  cart,
  customerName,
  selectedTable,
  orderType,
  processing,
  realtimeNotifications,
  totalCartAmount,
  metodePembayaran,
  nominalBayar,
  kembalian,
  searchQuery,
  selectedCategory,
  filteredProducts,
  addToCart,
  removeFromCart,
  updateQty,
  handleCheckout,
  goToDashboard,
  logout,
} = useKasirPresenter();
</script>

<template>
  <div
    class="h-dvh flex bg-base overflow-hidden font-sans relative w-full"
  >
    <!-- Realtime Notifications Banner -->
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <div
        v-for="notif in realtimeNotifications"
        :key="notif.id"
        class="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center shadow-primary/20 animate-bounce"
      >
        <i class="bx bx-bell text-xl text-primary mr-3"></i>
        <span class="text-sm font-medium">{{ notif.msg }}</span>
      </div>
    </div>

    <!-- Main Content (Products) -->
    <div class="flex-1 flex flex-col overflow-hidden relative w-full">
      <!-- Top Nav -->
      <header
        class="bg-white px-4 md:px-6 py-3 md:py-4 flex flex-wrap gap-3 justify-between items-center border-b border-gray-100 shrink-0"
      >
        <div class="flex items-center gap-2 md:gap-3">
          <div
            class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"
          >
            <i class="bx bx-store-alt text-lg md:text-xl"></i>
          </div>
          <h1 class="text-lg md:text-xl font-bold text-gray-800 tracking-tight">veePOS</h1>
        </div>

        <div class="flex items-center gap-2 md:gap-3 justify-end flex-wrap mt-2 sm:mt-0 lg:w-auto">
          <!-- Network Status Badge -->
          <div
            :class="[
              'px-2.5 md:px-3 py-1.5 rounded-full text-[10px] md:text-xs font-medium flex items-center gap-1.5 transition-colors',
              posStore.isOnline
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger',
            ]"
          >
            <div
              :class="[
                'w-1.5 h-1.5 md:w-2 md:h-2 rounded-full',
                posStore.isOnline ? 'bg-success' : 'bg-danger',
              ]"
            ></div>
            {{ posStore.isOnline ? "Online" : "Offline" }}
          </div>

          <button
            v-if="isInstallable"
            @click="installApp"
            class="hidden sm:flex text-xs md:text-sm font-medium bg-info hover:bg-info/80 text-white px-3 py-1.5 md:py-2 rounded-xl transition items-center gap-1.5 md:gap-2 shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
            Install
          </button>

          <button
            @click="goToDashboard()"
            class="bg-secondary text-gray-800 px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-[#c2aa96] transition shadow text-[10px] md:text-sm font-medium shrink-0"
          >
            Dashboard
          </button>
          <button
            @click="logout"
            class="bg-primary text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-primary/80 transition shadow text-[10px] md:text-sm font-medium shrink-0"
          >
            Logout
          </button>
        </div>
      </header>

      <!-- Offline Sync Banner -->
      <div
        v-if="posStore.pendingOrders.length > 0"
        class="bg-orange-50 px-6 py-3 border-b border-orange-100 text-sm text-orange-800 flex justify-between items-center shrink-0"
      >
        <div class="flex items-center">
          <i class="bx bx-cloud-upload text-lg mr-2"></i>
          <span class="font-medium"
            >{{ posStore.pendingOrders.length }} pesanan belum
            tersinkronisasi.</span
          >
        </div>
        <button
          v-if="posStore.isOnline"
          @click="posStore.syncPendingOrders()"
          class="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-700 transition flex items-center"
        >
          <i
            v-if="posStore.isSyncing"
            class="bx bx-loader-alt bx-spin mr-1"
          ></i>
          Sync Sekarang
        </button>
      </div>

      <!-- Search & Category Filter -->
      <div class="bg-white border-b border-gray-100 px-4 md:px-6 pt-4 pb-2 shrink-0 relative z-10">
        <!-- Search Bar -->
        <div class="relative mb-3">
          <i
            class="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
          ></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari menu..."
            class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
          />
        </div>

        <!-- Category Tabs -->
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            @click="selectedCategory = null"
            :class="[
              'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              selectedCategory === null
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
          >
            Semua
          </button>
          <button
            v-for="cat in posStore.categories"
            :key="cat.id"
            @click="selectedCategory = cat.id"
            :class="[
              'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              selectedCategory === cat.id
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
          >
            {{ cat.nama }}
          </button>
        </div>
      </div>

      <!-- Products Grid -->
      <main class="flex-1 overflow-y-auto p-4 md:p-6 relative">
        <div v-if="posStore.isLoading" class="flex justify-center mt-12">
          <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
        </div>

        <div
          v-else
          class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-28 md:pb-6"
        >
          <button
            v-for="p in filteredProducts"
            :key="p.id"
            @click="addToCart(p)"
            class="bg-white rounded-2xl p-3 flex flex-col items-start border border-gray-100 hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div
              class="h-32 w-full rounded-xl bg-gray-50 mb-3 overflow-hidden relative"
            >
              <img
                v-if="p.foto_url"
                :src="p.foto_url"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <i
                v-else
                class="bx bx-image text-gray-300 text-4xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              ></i>
            </div>
            <h3
              class="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight"
            >
              {{ p.nama }}
            </h3>
            <p class="text-primary font-bold mt-1 text-sm">
              Rp {{ p.harga.toLocaleString("id-ID") }}
            </p>
          </button>

          <!-- Empty State -->
          <div
            v-if="filteredProducts.length === 0"
            class="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl"
          >
            <i class="bx bx-basket text-4xl mb-2"></i>
            <p>
              {{
                searchQuery || selectedCategory
                  ? "Tidak ada menu yang sesuai"
                  : "Belum ada produk"
              }}
            </p>
          </div>
        </div>
      </main>

      <!-- Mobile Floating Cart Button -->
      <div
        v-if="cart.length > 0"
        class="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-gray-900 border border-gray-800 text-white p-3 rounded-2xl shadow-2xl z-30 flex items-center justify-between font-sans transition-all duration-300 transform scale-100"
      >
        <div class="flex items-center gap-3 pl-1">
          <div class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center relative shrink-0">
            <i class="bx bx-shopping-bag text-xl"></i>
            <span class="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full border-2 border-gray-900 shadow-sm">
              {{ cart.reduce((acc, item) => acc + item.qty, 0) }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] text-gray-400 font-medium tracking-wide">Total Pesanan</span>
            <span class="font-bold text-sm tracking-tight leading-none mt-0.5">Rp {{ totalCartAmount.toLocaleString("id-ID") }}</span>
          </div>
        </div>
        
        <button 
          @click="isCartMobileOpen = true"
          class="bg-primary hover:bg-[#c99188] px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20 flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          Lihat <i class="bx bx-chevron-right text-lg -mr-1"></i>
        </button>
      </div>
    </div>

    <!-- Mobile Cart Overlay -->
    <div 
      v-if="isCartMobileOpen" 
      @click="isCartMobileOpen = false"
      class="md:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 transition-opacity"
    ></div>

    <!-- Sidebar Cart -->
    <div
      :class="[
        'w-full max-w-[420px] md:max-w-none md:w-96 bg-white border-l border-gray-100 flex flex-col fixed md:relative z-50 shadow-2xl md:shadow-[-10px_0_30px_rgb(0,0,0,0.02)] shrink-0 h-dvh top-0 right-0 transition-transform duration-300 ease-in-out',
        isCartMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      ]"
    >
      <!-- Cart Header -->
      <div class="p-4 md:p-6 border-b border-gray-100 shrink-0 relative">
        <div class="flex justify-between items-center mb-4 md:mb-5">
          <h2 class="text-xl font-bold text-gray-800">Current Order</h2>
          <button 
            @click="isCartMobileOpen = false"
            class="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <i class="bx bx-x text-xl"></i>
          </button>
        </div>

        <div class="space-y-3">
          <div class="flex gap-2">
            <button
              @click="orderType = 'dine_in'"
              :class="[
                'flex-1 py-2 px-3 rounded-xl text-sm font-medium transition',
                orderType === 'dine_in'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
              ]"
            >
              Dine In
            </button>
            <button
              @click="orderType = 'takeaway'"
              :class="[
                'flex-1 py-2 px-3 rounded-xl text-sm font-medium transition',
                orderType === 'takeaway'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
              ]"
            >
              Takeaway
            </button>
          </div>

          <input
            v-model="customerName"
            type="text"
            placeholder="Customer Name"
            class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
          />

          <select
            v-if="orderType === 'dine_in'"
            v-model="selectedTable"
            class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition appearance-none"
          >
            <option value="">-- Table --</option>
            <option
              v-for="t in posStore.tables.filter(
                (t) => t.status === 'tersedia',
              )"
              :key="t.id"
              :value="t.id"
            >
              Meja {{ t.nomor_meja }}
            </option>
          </select>
        </div>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        <div
          v-if="cart.length === 0"
          class="h-full flex flex-col items-center justify-center text-gray-400"
        >
          <i class="bx bx-shopping-bag text-5xl mb-3 text-gray-300"></i>
          <p class="text-sm font-medium">Cart is empty</p>
        </div>

        <div
          v-for="(item, i) in cart"
          :key="i"
          class="flex gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100"
        >
          <!-- Thumbnail -->
          <div class="w-16 h-16 rounded-lg bg-gray-50 overflow-hidden shrink-0">
            <img
              v-if="item.product.foto_url"
              :src="item.product.foto_url"
              class="w-full h-full object-cover"
            />
            <i
              v-else
              class="bx bx-image text-gray-300 text-2xl w-full h-full flex items-center justify-center"
            ></i>
          </div>

          <!-- Details -->
          <div class="flex-1 flex flex-col justify-between py-0.5">
            <div class="flex justify-between items-start gap-2">
              <h4 class="font-medium text-gray-800 text-sm leading-tight">
                {{ item.product.nama }}
              </h4>
              <button
                @click="removeFromCart(i)"
                class="text-gray-300 hover:text-danger transition-colors pt-0.5"
              >
                <i class="bx bx-x text-lg"></i>
              </button>
            </div>

            <div class="flex justify-between items-center mt-auto">
              <!-- Qty Controls -->
              <div class="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                <button
                  @click="updateQty(i, -1)"
                  class="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-600 shadow-sm hover:text-primary transition-colors"
                >
                  <i class="bx bx-minus text-xs"></i>
                </button>
                <span
                  class="text-sm font-semibold text-gray-800 w-4 text-center"
                  >{{ item.qty }}</span
                >
                <button
                  @click="updateQty(i, 1)"
                  class="w-6 h-6 flex items-center justify-center rounded bg-white text-gray-600 shadow-sm hover:text-primary transition-colors"
                >
                  <i class="bx bx-plus text-xs"></i>
                </button>
              </div>
              <p class="font-bold text-primary text-sm">
                Rp {{ (item.qty * item.product.harga).toLocaleString("id-ID") }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart Footer -->
      <div class="p-5 bg-white border-t border-gray-100 shrink-0 space-y-3">
        <!-- Total -->
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Total</span>
          <span class="text-2xl font-bold text-gray-800"
            >Rp {{ totalCartAmount.toLocaleString("id-ID") }}</span
          >
        </div>

        <!-- Metode Pembayaran -->
        <div>
          <p
            class="text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wide"
          >
            Metode Pembayaran
          </p>
          <div class="flex gap-2">
            <button
              v-for="m in [
                { id: 'tunai', label: 'Tunai', icon: 'bx-money' },
                { id: 'transfer', label: 'Transfer', icon: 'bx-transfer' },
                { id: 'qris', label: 'QRIS', icon: 'bx-qr' },
              ]"
              :key="m.id"
              @click="metodePembayaran = m.id as any"
              :class="[
                'flex-1 py-2 px-2 rounded-xl text-xs font-medium transition flex flex-col items-center gap-1',
                metodePembayaran === m.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
              ]"
            >
              <i :class="['bx text-lg', m.icon]"></i>
              {{ m.label }}
            </button>
          </div>
        </div>

        <!-- Nominal Bayar & Kembalian (hanya untuk Tunai) -->
        <div v-if="metodePembayaran === 'tunai'" class="space-y-2">
          <div class="relative">
            <span
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium"
              >Rp</span
            >
            <input
              v-model="nominalBayar"
              type="number"
              min="0"
              placeholder="Nominal Bayar"
              class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
          <!-- Kembalian -->
          <div
            :class="[
              'flex justify-between items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              kembalian > 0
                ? 'bg-success/10 text-success'
                : 'bg-gray-50 text-gray-400',
            ]"
          >
            <span class="flex items-center gap-1.5">
              <i class="bx bx-rotate-left"></i>
              Kembalian
            </span>
            <span>Rp {{ kembalian.toLocaleString("id-ID") }}</span>
          </div>
        </div>

        <button
          @click="handleCheckout"
          :disabled="processing || cart.length === 0"
          :class="[
            'w-full py-4 rounded-xl text-white font-bold text-lg flex justify-center items-center transition-all shadow-lg',
            processing || cart.length === 0
              ? 'bg-gray-300 shadow-none cursor-not-allowed'
              : 'bg-primary hover:bg-[#c99188] shadow-primary/30',
          ]"
        >
          <i v-if="processing" class="bx bx-loader-alt bx-spin mr-2"></i>
          {{ processing ? "Memproses..." : "Checkout" }}
        </button>
      </div>
    </div>
  </div>
</template>
