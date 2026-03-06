<script setup lang="ts">
import { ref } from "vue";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "vue-chartjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

defineProps<{
  stats: {
    totalMenu: number;
    totalMeja: number;
    totalKasir: number;
    pendapatanHariIni: number;
  };
  chartData: any;
}>();

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Pendapatan Hari Ini</p>
            <h3 class="text-2xl font-bold text-gray-800 mt-2">
              Rp {{ stats.pendapatanHariIni.toLocaleString("id-ID") }}
            </h3>
          </div>
          <div class="bg-primary/10 p-4 rounded-full">
            <i class="bx bx-money text-3xl text-primary"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Total Menu</p>
            <h3 class="text-3xl font-bold text-gray-800 mt-2">
              {{ stats.totalMenu }}
            </h3>
          </div>
          <div class="bg-blue-50 p-4 rounded-full">
            <i class="bx bx-food-menu text-3xl text-blue-500"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Total Akun Kasir</p>
            <h3 class="text-3xl font-bold text-gray-800 mt-2">
              {{ stats.totalKasir }}
            </h3>
          </div>
          <div class="bg-orange-50 p-4 rounded-full">
            <i class="bx bx-user text-3xl text-orange-500"></i>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Total Meja</p>
            <h3 class="text-3xl font-bold text-gray-800 mt-2">
              {{ stats.totalMeja }}
            </h3>
          </div>
          <div class="bg-green-50 p-4 rounded-full">
            <i class="bx bx-table text-3xl text-green-500"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-96">
      <h3 class="text-lg font-bold text-gray-800 mb-4">
        Grafik Pendapatan Mingguan
      </h3>
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
