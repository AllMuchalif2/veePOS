import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../supabaseClient";

import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  role: "superadmin" | "admin" | "kasir" | string;
  id_toko?: string | null;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const profile = ref<UserProfile | null>(null);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    user.value = data.user;
    if (user.value) {
      const { data: p, error } = await supabase
        .from("user_profiles")
        .select("role,id_toko")
        .eq("id", user.value.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user profile", error);
      }
      profile.value = p as UserProfile | null;
    } else {
      profile.value = null;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    user.value = null;
    profile.value = null;
  }

  return { user, profile, loadUser, logout };
});
