<script setup lang="ts">
import { useTenantRegistrationPresenter } from "../../presenters/useTenantRegistrationPresenter";

const p = useTenantRegistrationPresenter();
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">
        Antrean Pendaftaran Tenant
      </h2>
      <button
        @click="p.fetchRegistrations()"
        class="p-2 text-slate-500 hover:text-blue-600 transition rounded-full hover:bg-blue-50"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          ></path>
        </svg>
      </button>
    </div>

    <!-- Info Credentials Sementara -->
    <div
      v-if="p.newTenantCreds.value"
      class="p-4 bg-green-50/80 text-green-700 rounded-xl border border-green-200/60 shadow-sm"
    >
      <div
        class="bg-white p-4 rounded-lg border border-green-100 text-sm shadow-sm"
      >
        <p class="text-slate-500 mb-3">
          <i class="bx bx-info-circle mr-1 align-middle text-green-500"></i>
          <span class="align-middle font-medium"
            >Beri tahu pendaftar detail akun mereka:</span
          >
        </p>
        <div class="flex flex-col sm:flex-row gap-4 sm:gap-8">
          <div>
            <span
              class="text-slate-400 text-xs uppercase tracking-wider block mb-1"
              >Email Admin</span
            >
            <span class="font-medium text-slate-800 flex items-center gap-2">
              <i class="bx bx-envelope text-slate-400"></i>
              {{ p.newTenantCreds.value.email }}
            </span>
          </div>
          <div class="h-px sm:h-auto sm:w-px bg-slate-100"></div>
          <div>
            <span
              class="text-slate-400 text-xs uppercase tracking-wider block mb-1"
              >Password Sementara</span
            >
            <span
              class="font-mono font-medium text-slate-800 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded flex items-center gap-2"
            >
              <i class="bx bx-lock-alt text-slate-400"></i>
              {{ p.newTenantCreds.value.password }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div
      class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="p-4 font-semibold text-slate-600 text-sm">
                Tanggal Daftar
              </th>
              <th class="p-4 font-semibold text-slate-600 text-sm">
                Nama Toko
              </th>
              <th class="p-4 font-semibold text-slate-600 text-sm">Kontak</th>
              <th class="p-4 font-semibold text-slate-600 text-sm">Status</th>
              <th class="p-4 font-semibold text-slate-600 text-sm text-center">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="p.loading.value">
              <td colspan="5" class="p-8 text-center text-slate-500">
                Memuat data...
              </td>
            </tr>
            <tr v-else-if="p.registrations.value.length === 0">
              <td colspan="5" class="py-12">
                <div
                  class="flex flex-col items-center justify-center text-slate-500"
                >
                  <svg
                    class="w-12 h-12 text-slate-300 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <span>Belum ada antrean pendaftar tenant.</span>
                </div>
              </td>
            </tr>
            <tr
              v-else
              v-for="reg in p.registrations.value"
              :key="reg.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <td class="p-4 text-sm text-slate-600 whitespace-nowrap">
                {{ p.formatDate(reg.created_at) }}
              </td>
              <td class="p-4">
                <div class="font-medium text-slate-900">
                  {{ reg.store_name }}
                </div>
              </td>
              <td class="p-4">
                <div class="text-sm text-slate-900 font-medium">
                  {{ reg.email }}
                </div>
                <div
                  class="text-xs text-slate-500 flex items-center gap-1 mt-0.5"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    ></path>
                  </svg>
                  {{ reg.phone }}
                </div>
              </td>
              <td class="p-4">
                <span
                  v-if="reg.status === 'pending'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                >
                  Menunggu ACC
                </span>
                <span
                  v-else-if="reg.status === 'approved'"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  Diterima
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                >
                  Ditolak
                </span>
              </td>
              <td class="p-4">
                <div
                  class="flex gap-2 justify-center"
                  v-if="reg.status === 'pending'"
                >
                  <button
                    @click="p.approveTenant(reg.id, reg.store_name)"
                    :disabled="p.processingId.value !== null"
                    class="flex-1 py-1.5 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Terima & Buat Akun"
                  >
                    Terima
                  </button>
                  <button
                    @click="p.rejectTenant(reg.id, reg.store_name)"
                    :disabled="p.processingId.value !== null"
                    class="flex-1 py-1.5 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tolak"
                  >
                    Tolak
                  </button>
                </div>
                <div v-else class="text-center text-slate-400 text-sm">-</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
