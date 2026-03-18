-- Canonical RLS policy baseline for this project.
-- Intended for version control/audit; apply manually in controlled environments.

-- =========================
-- Helper functions
-- =========================
CREATE OR REPLACE FUNCTION public.current_user_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
      AND up.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT regexp_replace(coalesce(input, ''), '[^0-9]', '', 'g');
$$;

-- =========================
-- RLS enablement
-- =========================
ALTER TABLE IF EXISTS public.kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meja ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detail_pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_registrations ENABLE ROW LEVEL SECURITY;

-- =========================
-- tenant_registrations
-- =========================
DROP POLICY IF EXISTS "Allow admin select" ON public.tenant_registrations;
CREATE POLICY "Allow admin select"
ON public.tenant_registrations
FOR SELECT
TO authenticated
USING (public.current_user_is_superadmin());

DROP POLICY IF EXISTS "Allow superadmin update" ON public.tenant_registrations;
CREATE POLICY "Allow superadmin update"
ON public.tenant_registrations
FOR UPDATE
TO authenticated
USING (public.current_user_is_superadmin())
WITH CHECK (public.current_user_is_superadmin());

-- No direct public INSERT policy here.
-- Public registration must go through Edge Function `submit-tenant-registration` with CAPTCHA verification.
DROP POLICY IF EXISTS "Allow public inserts" ON public.tenant_registrations;

-- =========================
-- toko
-- =========================
DROP POLICY IF EXISTS "Public read for toko" ON public.toko;
CREATE POLICY "Public read for toko"
ON public.toko
FOR SELECT
TO public
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin update toko" ON public.toko;
CREATE POLICY "Admin update toko"
ON public.toko
FOR UPDATE
TO public
USING (
  id IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.deleted_at IS NULL
  )
)
WITH CHECK (
  id IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS superadmin_all_toko ON public.toko;
CREATE POLICY superadmin_all_toko
ON public.toko
FOR ALL
TO public
USING (public.current_user_is_superadmin())
WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS "Toko can be viewed by anyone" ON public.toko;
DROP POLICY IF EXISTS staff_read_toko ON public.toko;
DROP POLICY IF EXISTS staff_toko_read ON public.toko;
DROP POLICY IF EXISTS superadmin_toko_all ON public.toko;
DROP POLICY IF EXISTS superadmin_toko_delete ON public.toko;
DROP POLICY IF EXISTS "Superadmin can create toko" ON public.toko;
DROP POLICY IF EXISTS "Superadmin can update toko" ON public.toko;
DROP POLICY IF EXISTS "Superadmin can delete toko" ON public.toko;

-- =========================
-- user_profiles
-- =========================
DROP POLICY IF EXISTS users_view_own ON public.user_profiles;
CREATE POLICY users_view_own
ON public.user_profiles
FOR SELECT
TO public
USING (id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS superadmin_all_profiles ON public.user_profiles;
CREATE POLICY superadmin_all_profiles
ON public.user_profiles
FOR ALL
TO public
USING (public.current_user_is_superadmin())
WITH CHECK (public.current_user_is_superadmin());

DROP POLICY IF EXISTS "Public read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Profile viewable by owner" ON public.user_profiles;
DROP POLICY IF EXISTS "User view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS users_view_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmin can create user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmin can update user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmin can delete user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS superadmin_profiles_all ON public.user_profiles;
DROP POLICY IF EXISTS superadmin_profiles_update ON public.user_profiles;

-- =========================
-- kategori
-- =========================
DROP POLICY IF EXISTS "Public read for kategori" ON public.kategori;
CREATE POLICY "Public read for kategori"
ON public.kategori
FOR SELECT
TO public
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Tenant ALL for kategori" ON public.kategori;
CREATE POLICY "Tenant ALL for kategori"
ON public.kategori
FOR ALL
TO public
USING (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
)
WITH CHECK (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Public can view kategori" ON public.kategori;

-- =========================
-- meja
-- =========================
DROP POLICY IF EXISTS "Public read for meja" ON public.meja;
CREATE POLICY "Public read for meja"
ON public.meja
FOR SELECT
TO public
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Tenant ALL for meja" ON public.meja;
CREATE POLICY "Tenant ALL for meja"
ON public.meja
FOR ALL
TO public
USING (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
)
WITH CHECK (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
);

-- =========================
-- menu
-- =========================
DROP POLICY IF EXISTS "Public read for produk" ON public.menu;
CREATE POLICY "Public read for produk"
ON public.menu
FOR SELECT
TO public
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Tenant ALL for produk" ON public.menu;
CREATE POLICY "Tenant ALL for produk"
ON public.menu
FOR ALL
TO public
USING (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
)
WITH CHECK (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Public can view menu" ON public.menu;
DROP POLICY IF EXISTS "Superadmin full access on produk" ON public.menu;

-- =========================
-- pesanan
-- =========================
DROP POLICY IF EXISTS "Tenant ALL for pesanan" ON public.pesanan;
CREATE POLICY "Tenant ALL for pesanan"
ON public.pesanan
FOR ALL
TO public
USING (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
)
WITH CHECK (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Anon insert pesanan" ON public.pesanan;
CREATE POLICY "Anon insert pesanan"
ON public.pesanan
FOR INSERT
TO anon
WITH CHECK (
  tipe_pesanan = 'qr_menu'
  AND status = 'pending'
  AND id_kasir IS NULL
  AND total_harga > 0
);

-- =========================
-- detail_pesanan
-- =========================
DROP POLICY IF EXISTS "Tenant ALL for detail_pesanan" ON public.detail_pesanan;
CREATE POLICY "Tenant ALL for detail_pesanan"
ON public.detail_pesanan
FOR ALL
TO public
USING (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
)
WITH CHECK (
  id_toko IN (
    SELECT up.id_toko
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Anon insert detail_pesanan" ON public.detail_pesanan;
CREATE POLICY "Anon insert detail_pesanan"
ON public.detail_pesanan
FOR INSERT
TO anon
WITH CHECK (
  jumlah > 0
  AND harga_satuan >= 0
  AND subtotal = jumlah * harga_satuan
);
