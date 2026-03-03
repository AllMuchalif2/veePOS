import { ref } from "vue";
import imageCompression from "browser-image-compression";
import { supabase } from "../supabaseClient";

export function useImageUpload() {
  const isUploading = ref(false);
  const uploadError = ref<string | null>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    isUploading.value = true;
    uploadError.value = null;

    try {
      // 1. Compress Image (Max 200KB)
      const options = {
        maxSizeMB: 0.2, // 200KB
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

      // 2. Generate a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // 3. Upload to Supabase Storage ('foto_produk' bucket)
      const { error: uploadErr } = await supabase.storage
        .from("foto_produk")
        .upload(filePath, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        throw uploadErr;
      }

      // 4. Get Public URL
      const { data } = supabase.storage
        .from("foto_produk")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      uploadError.value = error.message;
      return null;
    } finally {
      isUploading.value = false;
    }
  };

  return {
    isUploading,
    uploadError,
    uploadImage,
  };
}
