import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { supabase } from "../supabaseClient";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  // kasir dashboard
  {
    path: "/",
    name: "Kasir",
    component: () => import("../views/Kasir.vue"),
    meta: { requiresAuth: true, roles: ["kasir"] },
  },
  // admin toko (manajer toko)
  {
    path: "/admin-toko",
    name: "AdminToko",
    component: () => import("../views/Admin.vue"),
    meta: { requiresAuth: true, roles: ["admin"] },
  },
  // super administrator (developer)
  {
    path: "/superadmin",
    name: "SuperAdmin",
    component: () => import("../views/SuperAdmin.vue"),
    meta: { requiresAuth: true, roles: ["superadmin"] },
  },
  {
    path: "/menu",
    name: "MenuPelanggan",
    component: () => import("../views/MenuPelanggan.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

import { useAuthStore } from "../stores/authStore";

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  await auth.loadUser();

  const session = auth.user;
  const role = auth.profile?.role;

  // redirect unauthenticated users
  if (to.meta.requiresAuth && !session) {
    return next({ name: "Login" });
  }

  // already logged in, don't show login page
  if (to.name === "Login" && session) {
    // choose destination based on role
    if (role === "superadmin") return next({ name: "SuperAdmin" });
    if (role === "admin") return next({ name: "AdminToko" });
    if (role === "kasir") return next({ name: "Kasir" });
    return next({ name: "Kasir" });
  }

  // role guard
  const allowedRoles: string[] | undefined = to.meta.roles as any;
  if (allowedRoles && session) {
    if (!allowedRoles.includes(role || "")) {
      // optionally redirect to a 403 page or home
      return next({ name: "Login" });
    }
  }

  next();
});

export default router;
