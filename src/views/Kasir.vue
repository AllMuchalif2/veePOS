<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabaseClient";
import { usePosStore, Produk } from "../stores/posStore";

const router = useRouter();
const posStore = usePosStore();

const cart = ref<{ product: Produk; qty: number }[]>([]);
const customerName = ref("");
const selectedTable = ref("");
const orderType = ref<"dine_in" | "takeaway">("dine_in");
const processing = ref(false);

const realtimeNotifications = ref<{ id: string; msg: string }[]>([]);

// Realtime Subscription Placeholder
let pesananSubscription: any = null;

const totalCartAmount = computed(() => {
  return cart.value.reduce(
    (total, item) => total + item.product.harga * item.qty,
    0,
  );
});

const addToCart = (product: Produk) => {
  const existing = cart.value.find((item) => item.product.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.value.push({ product, qty: 1 });
  }
};

const removeFromCart = (index: number) => {
  cart.value.splice(index, 1);
};

const updateQty = (index: number, delta: number) => {
  const item = cart.value[index];
  if (item.qty + delta > 0) {
    item.qty += delta;
  } else {
    removeFromCart(index);
  }
};

const handleCheckout = async () => {
  if (cart.value.length === 0) return alert("Keranjang kosong");
  if (!customerName.value && orderType.value !== "qr_menu")
    return alert("Nama pelanggan wajib diisi");

  processing.value = true;
  try {
    const orderData = {
      id_meja: selectedTable.value || null,
      nama_pelanggan: customerName.value,
      tipe_pesanan: orderType.value,
      total_harga: totalCartAmount.value,
      items: cart.value.map((c) => ({
        id_produk: c.product.id,
        jumlah: c.qty,
        harga_satuan: c.product.harga,
        subtotal: c.qty * c.product.harga,
      })),
    };

    const res = await posStore.submitOrder(orderData);
    if (res.offline) {
      alert("Pesanan disimpan offline (akan disinkronkan saat online)");
    } else {
      alert("Pesanan berhasil!");
    }

    // Reset form
    cart.value = [];
    customerName.value = "";
    selectedTable.value = "";
  } catch (error: any) {
    alert("Checkout gagal: " + error.message);
  } finally {
    processing.value = false;
  }
};

const setupRealtime = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id_toko")
    .eq("id", userData.user.id)
    .single();
  if (!profile) return;

  pesananSubscription = supabase
    .channel("public:pesanan")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "pesanan",
        filter: `id_toko=eq.${profile.id_toko}`,
      },
      (payload) => {
        // Notification for new order, particularly from QR Menu
        if (payload.new.status === "pending") {
          realtimeNotifications.value.push({
            id: payload.new.id,
            msg: `Pesanan Baru dari ${payload.new.nama_pelanggan || "Pelanggan"} (Total: Rp ${payload.new.total_harga.toLocaleString("id-ID")})`,
          });

          // Auto remove notif after 10s
          setTimeout(() => {
            realtimeNotifications.value.shift();
          }, 10000);
        }
      },
    )
    .subscribe();
};

onMounted(async () => {
  await posStore.fetchMenu();
  await posStore.loadPendingOrders();
  setupRealtime();
});

onUnmounted(() => {
  if (pesananSubscription) {
    supabase.removeChannel(pesananSubscription);
  }
});

const logout = async () => {
  await supabase.auth.signOut();
  router.push("/login");
};
</script>

<template>
  <div
    class="h-screen flex flex-col md:flex-row bg-base overflow-hidden font-sans"
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
    <div class="flex-1 flex flex-col overflow-hidden relative">
      <!-- Top Nav -->
      <header
        class="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-100 shrink-0"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"
          >
            <i class="bx bx-store-alt text-xl"></i>
          </div>
          <h1 class="text-xl font-bold text-gray-800">Cafe POS</h1>
        </div>

        <div class="flex items-center gap-4">
          <!-- Network Status Badge -->
          <div
            :class="[
              'px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors',
              posStore.isOnline
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600',
            ]"
          >
            <div
              :class="[
                'w-2 h-2 rounded-full',
                posStore.isOnline ? 'bg-green-500' : 'bg-red-500',
              ]"
            ></div>
            {{ posStore.isOnline ? "Online" : "Offline Mode" }}
          </div>

          <button
            @click="router.push('/admin')"
            class="text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition"
          >
            Admin
          </button>
          <button
            @click="logout"
            class="text-gray-400 hover:text-red-500 text-xl transition"
          >
            <i class="bx bx-log-out-circle"></i>
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

      <!-- Products Grid -->
      <main class="flex-1 overflow-y-auto p-6">
        <div v-if="posStore.isLoading" class="flex justify-center mt-12">
          <i class="bx bx-loader-alt bx-spin text-4xl text-primary"></i>
        </div>

        <div
          v-else
          class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-24 md:pb-0"
        >
          <button
            v-for="p in posStore.products"
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
            v-if="posStore.products.length === 0"
            class="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl"
          >
            <i class="bx bx-basket text-4xl mb-2"></i>
            <p>Belum ada produk</p>
          </div>
        </div>
      </main>
    </div>

    <!-- Sidebar Cart -->
    <div
      class="w-full md:w-96 bg-white border-l border-gray-100 flex flex-col relative z-20 shadow-[-10px_0_30px_rgb(0,0,0,0.02)] shrink-0 h-[60vh] md:h-screen mt-auto md:mt-0"
    >
      <!-- Cart Header -->
      <div class="p-6 border-b border-gray-100 shrink-0">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Current Order</h2>

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
            <option v-for="t in posStore.tables" :key="t.id" :value="t.id">
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
                class="text-gray-300 hover:text-red-500 transition-colors pt-0.5"
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
      <div class="p-6 bg-white border-t border-gray-100 shrink-0">
        <div class="flex justify-between items-center mb-4">
          <span class="text-gray-500 font-medium">Total</span>
          <span class="text-2xl font-bold text-gray-800"
            >Rp {{ totalCartAmount.toLocaleString("id-ID") }}</span
          >
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
