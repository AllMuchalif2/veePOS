<template>
  <footer class="bg-base py-10 border-t border-secondary">
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4"
    >
      <div class="flex items-center gap-2">
        <img src="/veepos.png" alt="veePOS Logo" class="w-8 h-8 rounded-lg" />
      </div>
      <p class="text-gray-500 text-sm mb-6 max-w-xs">
        veePOS - Solusi kasir modern untuk pertumbuhan bisnis cafe dan restoran
        Anda.
      </p>
      <p class="text-gray-500 text-sm">
        © {{ new Date().getFullYear() }} veePOS by <a href="https://instagram.com/allmuchalif2" target="_blank" class="text-primary">AllMuchalif2</a>
      </p>  
      
    </div>
  </footer>
</template>

<script setup lang="ts"></script>
