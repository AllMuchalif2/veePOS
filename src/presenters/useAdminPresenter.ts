import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { useRouter } from "vue-router";
import { type Produk } from "../stores/posStore";
import { usePwaInstall } from "../composables/usePwaInstall";
import { useAuthStore } from "../stores/authStore";

export function useAdminPresenter() {
  const router = useRouter();
  const { isInstallable, installApp } = usePwaInstall();

  const products = ref<Produk[]>([]);
  const loading = ref(false);

  const activeTab = ref("dashboard");

  const stats = ref({
    totalMenu: 0,
    totalMeja: 0,
    totalKasir: 0,
    pendapatanHariIni: 0,
  });

  const chartData = ref({
    labels: [] as string[],
    datasets: [
      {
        label: "Pendapatan Harian (Rp)",
        backgroundColor: "#E6A398",
        borderColor: "#c99188",
        data: [] as number[],
      },
    ],
  });

  const loadDashboardData = async () => {
    loading.value = true;
    try {
      const authStore = useAuthStore();
      const tokoId = authStore.profile?.id_toko;

      if (!tokoId) return;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const startOf7DaysAgo = new Date();
      startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
      startOf7DaysAgo.setHours(0, 0, 0, 0);

      const [menuRes, mejaRes, kasirRes, incomeRes, weeklyIncomeRes] =
        await Promise.all([
          supabase
            .from("menu")
            .select("id", { count: "exact" })
            .eq("id_toko", tokoId)
            .is("deleted_at", null),
          supabase
            .from("meja")
            .select("id", { count: "exact" })
            .eq("id_toko", tokoId)
            .is("deleted_at", null),
          supabase
            .from("user_profiles")
            .select("id", { count: "exact" })
            .eq("id_toko", tokoId)
            .eq("role", "kasir")
            .is("deleted_at", null),
          supabase
            .from("pesanan")
            .select("total_harga")
            .eq("id_toko", tokoId)
            .eq("status", "selesai")
            .gte("created_at", startOfToday.toISOString()),
          supabase
            .from("pesanan")
            .select("total_harga, created_at")
            .eq("id_toko", tokoId)
            .eq("status", "selesai")
            .gte("created_at", startOf7DaysAgo.toISOString()),
        ]);

      stats.value.totalMenu = menuRes.count || 0;
      stats.value.totalMeja = mejaRes.count || 0;
      stats.value.totalKasir = kasirRes.count || 0;

      if (incomeRes.data) {
        stats.value.pendapatanHariIni = incomeRes.data.reduce(
          (sum, order) => sum + (order.total_harga || 0),
          0,
        );
      }

      if (weeklyIncomeRes.data) {
        const incomeMap = new Map<string, number>();
        const labels = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
          const dateStr = d.toISOString().split("T")[0];
          incomeMap.set(dateStr, 0);
          labels.push(dayName);
        }

        weeklyIncomeRes.data.forEach((order) => {
          const orderDate = order.created_at.split("T")[0];
          if (incomeMap.has(orderDate)) {
            incomeMap.set(
              orderDate,
              incomeMap.get(orderDate)! + (order.total_harga || 0),
            );
          }
        });

        const weeklyData = Array.from(incomeMap.values());

        chartData.value = {
          labels: labels,
          datasets: [
            {
              label: "Pendapatan Harian (Rp)",
              backgroundColor: "#E6A398",
              borderColor: "#c99188",
              data: weeklyData,
            },
          ],
        };
      }

      await refreshProducts(tokoId);
    } catch (error) {
      console.error("Error loading dashboard data", error);
    } finally {
      loading.value = false;
    }
  };

  const refreshProducts = async (idToko?: string) => {
    try {
      let tokoId = idToko;
      if (!tokoId) {
        const authStore = useAuthStore();
        tokoId = authStore.profile?.id_toko ?? undefined;
      }
      if (!tokoId) return;

      const { data } = await supabase
        .from("menu")
        .select("*")
        .eq("id_toko", tokoId)
        .is("deleted_at", null)
        .order("nama");

      products.value = data || [];
    } catch (error) {
      console.error("Error refreshing products", error);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  onMounted(() => {
    loadDashboardData();
  });

  return {
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
    refreshProducts,
  };
}
