<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div class="text-center max-w-md w-full">
      <!-- Icon/Illustration -->
      <div class="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
        <i class="bx bx-error-circle text-6xl text-primary"></i>
      </div>

      <!-- Content -->
      <h1 class="text-5xl font-black text-slate-800 mb-4 tracking-tight">404</h1>
      <h2 class="text-2xl font-bold text-slate-700 mb-3">Halaman Tidak Ditemukan</h2>
      <p class="text-slate-500 mb-8 leading-relaxed">
        Maaf, halaman yang Anda cari tidak ada atau Anda tidak memiliki akses ke halaman ini.
      </p>

      <!-- Action -->
      <router-link
        to="/"
        class="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
      >
        <i class="bx bx-home-alt text-xl"></i>
        Kembali ke Beranda
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// Simple 404 page, no extra logic needed.
</script>
