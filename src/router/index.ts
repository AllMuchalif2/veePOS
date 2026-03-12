import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  {
    path: "/",
    name: "LandingPage",
    component: () => import("../views/LandingPage.vue"),
  },
  // kasir dashboard
  {
    path: "/kasir",
    name: "Kasir",
    component: () => import("../views/Kasir.vue"),
    meta: { requiresAuth: true, roles: ["kasir", "admin"] },
  },
  {
    path: "/kasir-dashboard",
    name: "KasirDashboard",
    component: () => import("../views/KasirDashboard.vue"),
    meta: { requiresAuth: true, roles: ["kasir", "admin"] },
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
    path: "/super-admin",
    name: "SuperAdmin",
    component: () => import("../views/SuperAdmin.vue"),
    meta: { requiresAuth: true, roles: ["superadmin"] },
  },
  {
    path: "/menu",
    name: "MenuPelanggan",
    component: () => import("../views/MenuPelanggan.vue"),
  },
  {
    path: "/menu/:tokoSlug/:mejaSlug",
    name: "MenuPelangganSlug",
    component: () => import("../views/MenuPelanggan.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

import { useAuthStore } from "../stores/authStore";

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  await auth.loadUser();

  const session = auth.user;
  const role = auth.profile?.role;

  if (to.meta.requiresAuth && !session) {
    return next({ name: "Login" });
  }

  if (to.name === "Login" && session) {
    if (role === "superadmin") return next({ name: "SuperAdmin" });
    if (role === "admin") return next({ name: "AdminToko" });
    if (role === "kasir") return next({ name: "Kasir" });
    return next({ name: "Kasir" });
  }

  const allowedRoles: string[] | undefined = to.meta.roles as any;
  if (allowedRoles && session) {
    if (!allowedRoles.includes(role || "")) {
      return next({ name: "Login" });
    }
  }

  next();
});

export default router;
