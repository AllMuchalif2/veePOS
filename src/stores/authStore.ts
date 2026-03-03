import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../supabaseClient";

export interface UserProfile {
  role: "superadmin" | "admin" | "kasir" | string;
  id_toko?: string | null;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref(supabase.auth.getUser().then(res => res.data.user));
  const profile = ref<UserProfile | null>(null);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    user.value = data.user;
    if (user.value) {
      // use maybeSingle so we don't get a 406 if the profile doesn't yet exist
      const { data: p, error } = await supabase
        .from("user_profiles")
        .select("role,id_toko")
        .eq("id", user.value.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        // any error other than 406 (no rows) we log
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
