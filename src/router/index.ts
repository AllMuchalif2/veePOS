import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { supabase } from "../supabaseClient";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  {
    path: "/",
    name: "Kasir",
    component: () => import("../views/Kasir.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("../views/Admin.vue"),
    meta: { requiresAuth: true },
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

router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (to.meta.requiresAuth && !session) {
    next({ name: "Login" });
  } else if (to.name === "Login" && session) {
    next({ name: "Kasir" });
  } else {
    next();
  }
});

export default router;
