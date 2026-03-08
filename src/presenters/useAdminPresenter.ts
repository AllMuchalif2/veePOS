import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { useRouter } from "vue-router";
import { usePosStore, type Produk } from "../stores/posStore";
import { usePwaInstall } from "../composables/usePwaInstall";

export function useAdminPresenter() {
  const router = useRouter();
  const posStore = usePosStore();
  const { isInstallable, installApp } = usePwaInstall();

  const products = ref<Produk[]>([]);
  const loading = ref(false);

  const activeTab = ref("dashboard");

  // Dashboard Stats
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
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id_toko")
        .eq("id", userData.user?.id)
        .single();

      if (!profile?.id_toko) return;

      // Get today's income
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Get 7 days ago for the chart
      const startOf7DaysAgo = new Date();
      startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
      startOf7DaysAgo.setHours(0, 0, 0, 0);

      // Parallel fetch for stats
      const [menuRes, mejaRes, kasirRes, incomeRes, weeklyIncomeRes] =
        await Promise.all([
          supabase
            .from("menu")
            .select("id", { count: "exact" })
            .eq("id_toko", profile.id_toko)
            .is("deleted_at", null),
          supabase
            .from("meja")
            .select("id", { count: "exact" })
            .eq("id_toko", profile.id_toko)
            .is("deleted_at", null),
          supabase
            .from("user_profiles")
            .select("id", { count: "exact" })
            .eq("id_toko", profile.id_toko)
            .eq("role", "kasir")
            .is("deleted_at", null),
          // Get today's income
          supabase
            .from("pesanan")
            .select("total_harga")
            .eq("id_toko", profile.id_toko)
            .eq("status", "selesai")
            .gte("created_at", startOfToday.toISOString()),
          // Get last 7 days income
          supabase
            .from("pesanan")
            .select("total_harga, created_at")
            .eq("id_toko", profile.id_toko)
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

      // Process weekly income map
      if (weeklyIncomeRes.data) {
        // Initialize last 7 days with 0
        const incomeMap = new Map<string, number>();
        const labels = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          // Get short day name for Indonesian locale like "Sen", "Sel"
          const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
          const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
          incomeMap.set(dateStr, 0);
          labels.push(dayName);
        }

        // Aggregate orders
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

        // Update chart stats
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

      // Also load initial products for the Menu tab
      await posStore.fetchMenu();
      products.value = posStore.products;
    } catch (error) {
      console.error("Error loading dashboard data", error);
    } finally {
      loading.value = false;
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
  };
}
