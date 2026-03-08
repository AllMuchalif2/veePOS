import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";
import { swalConfirm, swalSuccess, swalError } from "../composables/useSwal";

export interface TenantRegistration {
  id: string;
  store_name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function useTenantRegistrationPresenter() {
  const registrations = ref<TenantRegistration[]>([]);
  const loading = ref(true);
  const processingId = ref<string | null>(null);
  const newTenantCreds = ref<{
    email: string;
    password: string;
    store: string;
  } | null>(null);

  const fetchRegistrations = async () => {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("tenant_registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      registrations.value = data || [];
    } catch (error: any) {
      console.error("Error fetching registrations:", error);
      swalError("Gagal", "Gagal memuat data pendaftar");
    } finally {
      loading.value = false;
    }
  };

  const approveTenant = async (id: string, storeName: string) => {
    const isConfirmed = await swalConfirm(
      "Setujui Pendaftaran?",
      `Apakah Anda yakin ingin menyetujui pendaftaran toko "${storeName}"? Ini akan membuat akun admin toko baru.`,
    );
    if (!isConfirmed) return;

    processingId.value = id;
    newTenantCreds.value = null;

    try {
      const { data, error } = await supabase.functions.invoke(
        "approve-tenant",
        {
          body: { registrationId: id },
        },
      );
      if (error) throw error;

      newTenantCreds.value = {
        email: data.credentials.email,
        password: data.credentials.temporaryPassword,
        store: storeName,
      };

      await swalSuccess("Berhasil!", `Toko ${storeName} telah aktif.`);
      await fetchRegistrations();
    } catch (error: any) {
      let displayError = "Terjadi kesalahan saat approve tenant";
      if (error instanceof Error) {
        displayError = error.message;
        if (error.name === "FunctionsHttpError" && (error as any).context) {
          try {
            const bodyText = await (error as any).context.text();
            const bodyJson = JSON.parse(bodyText);
            if (bodyJson.error) displayError = bodyJson.error;
          } catch (e) {
            /* ignore */
          }
        }
      }
      swalError("Gagal", displayError);
    } finally {
      processingId.value = null;
    }
  };

  const rejectTenant = async (id: string, storeName: string) => {
    const isConfirmed = await swalConfirm(
      "Tolak Pendaftaran?",
      `Anda yakin ingin menolak toko "${storeName}"?`,
    );
    if (!isConfirmed) return;

    processingId.value = id;
    try {
      const { error } = await supabase
        .from("tenant_registrations")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      await swalSuccess(
        "Ditolak",
        `Pendaftaran toko ${storeName} telah ditolak.`,
      );
      await fetchRegistrations();
    } catch (error: any) {
      swalError("Gagal", "Gagal menolak pendaftaran");
    } finally {
      processingId.value = null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  onMounted(() => {
    fetchRegistrations();
  });

  return {
    registrations,
    loading,
    processingId,
    newTenantCreds,
    fetchRegistrations,
    approveTenant,
    rejectTenant,
    formatDate,
  };
}
