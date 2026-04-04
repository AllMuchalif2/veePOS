--
-- PostgreSQL database dump
--

\restrict kBgL2PdbfsPn92CJbMfcsh2DKouGeEcdpudSytqRUpqtv9XIoWeVC9f2BS3r65r

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: add_item_to_order(uuid, uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_item_to_order(p_order_id uuid, p_menu_id uuid, p_jumlah integer, p_id_toko uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_harga numeric;
  v_subtotal numeric;
  v_existing_id uuid;
BEGIN
  -- 1. Ambil harga menu terbaru
  SELECT harga INTO v_harga FROM public.menu WHERE id = p_menu_id;
  
  IF v_harga IS NULL THEN
     RETURN jsonb_build_object('success', false, 'message', 'Menu tidak ditemukan');
  END IF;

  v_subtotal := v_harga * p_jumlah;

  -- 2. Cek apakah menu yang sama sudah ada di pesanan ini (dan statusnya masih tersedia)
  SELECT id INTO v_existing_id 
  FROM public.detail_pesanan 
  WHERE id_pesanan = p_order_id 
    AND id_menu = p_menu_id 
    AND status = 'tersedia'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Jika sudah ada, tambahkan jumlahnya saja (Grouping)
    UPDATE public.detail_pesanan 
    SET jumlah = jumlah + p_jumlah,
        subtotal = subtotal + v_subtotal
    WHERE id = v_existing_id;
  ELSE
    -- Jika belum ada, baru pindah ke baris baru
    INSERT INTO public.detail_pesanan (id_pesanan, id_toko, id_menu, jumlah, harga_satuan, subtotal)
    VALUES (p_order_id, p_id_toko, p_menu_id, p_jumlah, v_harga, v_subtotal);
  END IF;

  -- 3. Update total_harga di pesanan induk
  UPDATE public.pesanan SET total_harga = total_harga + v_subtotal WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION public.add_item_to_order(p_order_id uuid, p_menu_id uuid, p_jumlah integer, p_id_toko uuid) OWNER TO postgres;

--
-- Name: can_submit_tenant_registration(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.can_submit_tenant_registration(in_email text, in_phone text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT
    (
      SELECT count(*)
      FROM public.tenant_registrations tr
      WHERE lower(tr.email) = lower(coalesce(in_email, ''))
        AND tr.created_at > now() - interval '15 minutes'
    ) < 3
    AND (
      SELECT count(*)
      FROM public.tenant_registrations tr
      WHERE public.normalize_phone(tr.phone) = public.normalize_phone(in_phone)
        AND tr.created_at > now() - interval '15 minutes'
    ) < 3
    AND NOT EXISTS (
      SELECT 1
      FROM public.tenant_registrations tr
      WHERE lower(tr.email) = lower(coalesce(in_email, ''))
        AND tr.status = 'pending'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.tenant_registrations tr
      WHERE public.normalize_phone(tr.phone) = public.normalize_phone(in_phone)
        AND tr.status = 'pending'
    )
    AND (
      SELECT count(*)
      FROM public.tenant_registrations tr
      WHERE tr.created_at > now() - interval '1 minute'
    ) < 120;
$$;


ALTER FUNCTION public.can_submit_tenant_registration(in_email text, in_phone text) OWNER TO postgres;

--
-- Name: current_user_is_superadmin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_user_is_superadmin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'superadmin'
      AND up.deleted_at IS NULL
  );
$$;


ALTER FUNCTION public.current_user_is_superadmin() OWNER TO postgres;

--
-- Name: generate_slug(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_slug(t text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN trim(both '-' from lower(regexp_replace(trim(t), '[^a-zA-Z0-9]+', '-', 'g')));
END;
$$;


ALTER FUNCTION public.generate_slug(t text) OWNER TO postgres;

--
-- Name: handle_item_unavailable(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_item_unavailable(p_detail_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_pesanan_id uuid;
  v_menu_id uuid;
  v_subtotal numeric;
BEGIN
  -- Ambil info detail
  SELECT id_pesanan, id_menu, subtotal 
  INTO v_pesanan_id, v_menu_id, v_subtotal
  FROM public.detail_pesanan 
  WHERE id = p_detail_id;

  -- Jika sudah kosong, abaikan
  IF (SELECT status FROM public.detail_pesanan WHERE id = p_detail_id) = 'kosong' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item sudah ditandai kosong');
  END IF;

  -- Update status detail_pesanan
  UPDATE public.detail_pesanan SET status = 'kosong' WHERE id = p_detail_id;

  -- Kurangi total_harga di pesanan
  UPDATE public.pesanan SET total_harga = total_harga - v_subtotal WHERE id = v_pesanan_id;

  -- Matikan ketersediaan menu agar tidak dipesan orang lain
  UPDATE public.menu SET tersedia = false WHERE id = v_menu_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION public.handle_item_unavailable(p_detail_id uuid) OWNER TO postgres;

--
-- Name: normalize_phone(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalize_phone(input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT regexp_replace(coalesce(input, ''), '[^0-9]', '', 'g');
$$;


ALTER FUNCTION public.normalize_phone(input text) OWNER TO postgres;

--
-- Name: submit_order(uuid, uuid, text, text, numeric, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.submit_order(p_id_toko uuid, p_id_meja uuid, p_nama_pelanggan text, p_tipe_pesanan text, p_total_harga numeric, p_metode_pembayaran text, p_id_kasir uuid, p_items jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_id_pesanan UUID;
  v_nomor_pesanan TEXT;
  v_item JSONB;
BEGIN
  -- Generate nomor_pesanan
  v_nomor_pesanan := 'INV-' || (extract(epoch from now()) * 1000)::bigint::text;

  -- 1. Insert pesanan dengan status 'diproses' (BUKAN 'selesai')
  INSERT INTO pesanan (
    id_toko, id_meja, nama_pelanggan, tipe_pesanan, total_harga, 
    metode_pembayaran, status, nomor_pesanan, id_kasir
  ) VALUES (
    p_id_toko, p_id_meja, p_nama_pelanggan, p_tipe_pesanan, p_total_harga, 
    p_metode_pembayaran, 'diproses', v_nomor_pesanan, p_id_kasir
  ) RETURNING id INTO v_id_pesanan;

  -- 2. Insert detail_pesanan
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO detail_pesanan (
      id_pesanan, id_toko, id_menu, jumlah, harga_satuan, subtotal
    ) VALUES (
      v_id_pesanan, p_id_toko, (v_item->>'id_menu')::UUID, 
      (v_item->>'jumlah')::INT, (v_item->>'harga_satuan')::NUMERIC, 
      (v_item->>'subtotal')::NUMERIC
    );
  END LOOP;

  -- 3. Update meja status to 'terisi' if dine_in
  IF p_tipe_pesanan = 'dine_in' AND p_id_meja IS NOT NULL THEN
    UPDATE meja SET status = 'terisi' WHERE id = p_id_meja;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'id_pesanan', v_id_pesanan,
    'nomor_pesanan', v_nomor_pesanan
  );
END;
$$;


ALTER FUNCTION public.submit_order(p_id_toko uuid, p_id_meja uuid, p_nama_pelanggan text, p_tipe_pesanan text, p_total_harga numeric, p_metode_pembayaran text, p_id_kasir uuid, p_items jsonb) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: detail_pesanan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detail_pesanan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_pesanan uuid NOT NULL,
    id_toko uuid NOT NULL,
    id_menu uuid,
    jumlah integer NOT NULL,
    harga_satuan numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'tersedia'::text
);


ALTER TABLE public.detail_pesanan OWNER TO postgres;

--
-- Name: kategori; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kategori (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_toko uuid NOT NULL,
    nama text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE public.kategori OWNER TO postgres;

--
-- Name: meja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meja (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_toko uuid NOT NULL,
    nomor_meja text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    status text DEFAULT 'tersedia'::text,
    slug text
);


ALTER TABLE public.meja OWNER TO postgres;

--
-- Name: menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_toko uuid NOT NULL,
    id_kategori uuid,
    nama text NOT NULL,
    harga numeric(12,2) NOT NULL,
    deskripsi text,
    foto_url text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tersedia boolean DEFAULT true NOT NULL
);


ALTER TABLE public.menu OWNER TO postgres;

--
-- Name: pesanan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pesanan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_toko uuid NOT NULL,
    id_meja uuid,
    nama_pelanggan text,
    tipe_pesanan text NOT NULL,
    status text DEFAULT 'pending'::text,
    total_harga numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    nomor_pesanan text,
    id_kasir uuid,
    metode_pembayaran text,
    nominal_bayar numeric,
    kembalian numeric,
    CONSTRAINT pesanan_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'diproses'::text, 'selesai'::text, 'dibatalkan'::text]))),
    CONSTRAINT pesanan_tipe_pesanan_check CHECK ((tipe_pesanan = ANY (ARRAY['dine_in'::text, 'takeaway'::text, 'qr_menu'::text])))
);


ALTER TABLE public.pesanan OWNER TO postgres;

--
-- Name: tenant_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tenant_registrations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.tenant_registrations OWNER TO postgres;

--
-- Name: toko; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.toko (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_toko text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    slug text
);


ALTER TABLE public.toko OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    id_toko uuid NOT NULL,
    role text NOT NULL,
    nama text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    email text,
    CONSTRAINT user_profiles_id_toko_check CHECK (((id_toko IS NOT NULL) OR (role = 'superadmin'::text))),
    CONSTRAINT user_profiles_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'kasir'::text])))
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: detail_pesanan detail_pesanan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pesanan
    ADD CONSTRAINT detail_pesanan_pkey PRIMARY KEY (id);


--
-- Name: kategori kategori_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_pkey PRIMARY KEY (id);


--
-- Name: meja meja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meja
    ADD CONSTRAINT meja_pkey PRIMARY KEY (id);


--
-- Name: meja meja_slug_unique_per_toko; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meja
    ADD CONSTRAINT meja_slug_unique_per_toko UNIQUE (id_toko, slug);


--
-- Name: meja meja_toko_nomor_unik; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meja
    ADD CONSTRAINT meja_toko_nomor_unik UNIQUE (id_toko, nomor_meja);


--
-- Name: menu menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_pkey PRIMARY KEY (id);


--
-- Name: pesanan pesanan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesanan
    ADD CONSTRAINT pesanan_pkey PRIMARY KEY (id);


--
-- Name: tenant_registrations tenant_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_registrations
    ADD CONSTRAINT tenant_registrations_pkey PRIMARY KEY (id);


--
-- Name: toko toko_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko
    ADD CONSTRAINT toko_pkey PRIMARY KEY (id);


--
-- Name: toko toko_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko
    ADD CONSTRAINT toko_slug_key UNIQUE (slug);


--
-- Name: toko toko_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.toko
    ADD CONSTRAINT toko_slug_unique UNIQUE (slug);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: idx_meja_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meja_slug ON public.meja USING btree (id_toko, slug);


--
-- Name: idx_tenant_registrations_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenant_registrations_created_at ON public.tenant_registrations USING btree (created_at DESC);


--
-- Name: idx_tenant_registrations_email_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenant_registrations_email_lower ON public.tenant_registrations USING btree (lower(email));


--
-- Name: idx_tenant_registrations_phone_digits; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenant_registrations_phone_digits ON public.tenant_registrations USING btree (regexp_replace(phone, '\\D'::text, ''::text, 'g'::text));


--
-- Name: idx_toko_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_toko_slug ON public.toko USING btree (slug);


--
-- Name: detail_pesanan detail_pesanan_id_menu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pesanan
    ADD CONSTRAINT detail_pesanan_id_menu_fkey FOREIGN KEY (id_menu) REFERENCES public.menu(id) ON DELETE SET NULL;


--
-- Name: detail_pesanan detail_pesanan_id_pesanan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pesanan
    ADD CONSTRAINT detail_pesanan_id_pesanan_fkey FOREIGN KEY (id_pesanan) REFERENCES public.pesanan(id) ON DELETE CASCADE;


--
-- Name: detail_pesanan detail_pesanan_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detail_pesanan
    ADD CONSTRAINT detail_pesanan_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id) ON DELETE CASCADE;


--
-- Name: kategori kategori_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kategori
    ADD CONSTRAINT kategori_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id) ON DELETE CASCADE;


--
-- Name: meja meja_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meja
    ADD CONSTRAINT meja_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id) ON DELETE CASCADE;


--
-- Name: menu menu_id_kategori_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_id_kategori_fkey FOREIGN KEY (id_kategori) REFERENCES public.kategori(id) ON DELETE SET NULL;


--
-- Name: menu menu_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id) ON DELETE CASCADE;


--
-- Name: pesanan pesanan_id_kasir_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesanan
    ADD CONSTRAINT pesanan_id_kasir_fkey FOREIGN KEY (id_kasir) REFERENCES public.user_profiles(id);


--
-- Name: pesanan pesanan_id_meja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesanan
    ADD CONSTRAINT pesanan_id_meja_fkey FOREIGN KEY (id_meja) REFERENCES public.meja(id) ON DELETE SET NULL;


--
-- Name: pesanan pesanan_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesanan
    ADD CONSTRAINT pesanan_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_id_toko_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id) ON DELETE CASCADE;


--
-- Name: toko Admin update toko; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin update toko" ON public.toko FOR UPDATE USING ((id IN ( SELECT user_profiles.id_toko
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));


--
-- Name: tenant_registrations Allow admin select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow admin select" ON public.tenant_registrations FOR SELECT TO authenticated USING (true);


--
-- Name: tenant_registrations Allow public inserts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public inserts" ON public.tenant_registrations FOR INSERT WITH CHECK (((status = 'pending'::text) AND ((length(TRIM(BOTH FROM store_name)) >= 2) AND (length(TRIM(BOTH FROM store_name)) <= 100)) AND (POSITION(('@'::text) IN (email)) > 1) AND ((length(TRIM(BOTH FROM email)) >= 5) AND (length(TRIM(BOTH FROM email)) <= 200)) AND ((length(public.normalize_phone(phone)) >= 8) AND (length(public.normalize_phone(phone)) <= 20)) AND public.can_submit_tenant_registration(email, phone)));


--
-- Name: tenant_registrations Allow superadmin update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow superadmin update" ON public.tenant_registrations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'superadmin'::text)))));


--
-- Name: detail_pesanan Anon insert detail_pesanan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anon insert detail_pesanan" ON public.detail_pesanan FOR INSERT TO anon WITH CHECK (((jumlah > 0) AND (harga_satuan >= (0)::numeric) AND (subtotal = ((jumlah)::numeric * harga_satuan)) AND (EXISTS ( SELECT 1
   FROM public.pesanan p
  WHERE ((p.id = detail_pesanan.id_pesanan) AND (p.id_toko = detail_pesanan.id_toko) AND (p.tipe_pesanan = 'qr_menu'::text) AND (p.status = 'pending'::text) AND (p.deleted_at IS NULL)))) AND ((id_menu IS NULL) OR (EXISTS ( SELECT 1
   FROM public.menu mn
  WHERE ((mn.id = detail_pesanan.id_menu) AND (mn.id_toko = detail_pesanan.id_toko) AND (mn.deleted_at IS NULL)))))));


--
-- Name: pesanan Anon insert pesanan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anon insert pesanan" ON public.pesanan FOR INSERT TO anon WITH CHECK (((tipe_pesanan = 'qr_menu'::text) AND (status = 'pending'::text) AND (id_kasir IS NULL) AND (total_harga > (0)::numeric) AND (EXISTS ( SELECT 1
   FROM public.toko t
  WHERE ((t.id = pesanan.id_toko) AND (t.deleted_at IS NULL)))) AND ((id_meja IS NULL) OR (EXISTS ( SELECT 1
   FROM public.meja m
  WHERE ((m.id = pesanan.id_meja) AND (m.id_toko = pesanan.id_toko) AND (m.deleted_at IS NULL)))))));


--
-- Name: user_profiles Profile viewable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profile viewable by owner" ON public.user_profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: kategori Public can view kategori; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view kategori" ON public.kategori FOR SELECT TO anon USING ((deleted_at IS NULL));


--
-- Name: menu Public can view menu; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view menu" ON public.menu FOR SELECT TO anon USING (((deleted_at IS NULL) AND (tersedia = true)));


--
-- Name: user_profiles Public read all profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read all profiles" ON public.user_profiles FOR SELECT USING (((deleted_at IS NULL) AND true));


--
-- Name: kategori Public read for kategori; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read for kategori" ON public.kategori FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: meja Public read for meja; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read for meja" ON public.meja FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: menu Public read for produk; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read for produk" ON public.menu FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: toko Public read for toko; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read for toko" ON public.toko FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: toko Superadmin can create toko; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Superadmin can create toko" ON public.toko FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'superadmin'::text)))));


--
-- Name: user_profiles Superadmin can create user_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Superadmin can create user_profiles" ON public.user_profiles FOR INSERT WITH CHECK (public.current_user_is_superadmin());


--
-- Name: toko Superadmin can delete toko; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Superadmin can delete toko" ON public.toko FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'superadmin'::text)))));


--
-- Name: user_profiles Superadmin can delete user_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Superadmin can delete user_profiles" ON public.user_profiles FOR DELETE USING (public.current_user_is_superadmin());


--
-- Name: toko Superadmin can update toko; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Superadmin can update toko" ON public.toko FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'superadmin'::text)))));


--
-- Name: user_profiles Superadmin can update user_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Superadmin can update user_profiles" ON public.user_profiles FOR UPDATE USING (public.current_user_is_superadmin()) WITH CHECK (public.current_user_is_superadmin());


--
-- Name: menu Superadmin full access on produk; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Superadmin full access on produk" ON public.menu USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'superadmin'::text)))));


--
-- Name: detail_pesanan Tenant ALL for detail_pesanan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant ALL for detail_pesanan" ON public.detail_pesanan USING ((id_toko IN ( SELECT user_profiles.id_toko
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- Name: kategori Tenant ALL for kategori; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant ALL for kategori" ON public.kategori USING ((id_toko IN ( SELECT user_profiles.id_toko
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- Name: meja Tenant ALL for meja; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant ALL for meja" ON public.meja USING ((id_toko IN ( SELECT user_profiles.id_toko
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- Name: pesanan Tenant ALL for pesanan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant ALL for pesanan" ON public.pesanan USING ((id_toko IN ( SELECT user_profiles.id_toko
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- Name: menu Tenant ALL for produk; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Tenant ALL for produk" ON public.menu USING ((id_toko IN ( SELECT user_profiles.id_toko
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));


--
-- Name: toko Toko can be viewed by anyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Toko can be viewed by anyone" ON public.toko FOR SELECT USING (true);


--
-- Name: user_profiles User view own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "User view own profile" ON public.user_profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: user_profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: detail_pesanan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.detail_pesanan ENABLE ROW LEVEL SECURITY;

--
-- Name: kategori; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;

--
-- Name: meja; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.meja ENABLE ROW LEVEL SECURITY;

--
-- Name: menu; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;

--
-- Name: pesanan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pesanan ENABLE ROW LEVEL SECURITY;

--
-- Name: toko staff_read_toko; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY staff_read_toko ON public.toko FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: toko staff_toko_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY staff_toko_read ON public.toko FOR SELECT USING (true);


--
-- Name: user_profiles superadmin_all_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY superadmin_all_profiles ON public.user_profiles USING (public.current_user_is_superadmin()) WITH CHECK (public.current_user_is_superadmin());


--
-- Name: toko superadmin_all_toko; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY superadmin_all_toko ON public.toko USING ((auth.uid() IN ( SELECT user_profiles.id
   FROM public.user_profiles
  WHERE ((user_profiles.role = 'superadmin'::text) AND (user_profiles.deleted_at IS NULL))))) WITH CHECK ((auth.uid() IN ( SELECT user_profiles.id
   FROM public.user_profiles
  WHERE ((user_profiles.role = 'superadmin'::text) AND (user_profiles.deleted_at IS NULL)))));


--
-- Name: toko superadmin_toko_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY superadmin_toko_all ON public.toko USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'superadmin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'superadmin'::text)))));


--
-- Name: toko superadmin_toko_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY superadmin_toko_delete ON public.toko FOR UPDATE USING ((( SELECT user_profiles.role
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1) = 'superadmin'::text)) WITH CHECK ((( SELECT user_profiles.role
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1) = 'superadmin'::text));


--
-- Name: tenant_registrations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenant_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: toko; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.toko ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles users_view_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_view_own ON public.user_profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: user_profiles users_view_own_profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_view_own_profile ON public.user_profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION add_item_to_order(p_order_id uuid, p_menu_id uuid, p_jumlah integer, p_id_toko uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_item_to_order(p_order_id uuid, p_menu_id uuid, p_jumlah integer, p_id_toko uuid) TO anon;
GRANT ALL ON FUNCTION public.add_item_to_order(p_order_id uuid, p_menu_id uuid, p_jumlah integer, p_id_toko uuid) TO authenticated;
GRANT ALL ON FUNCTION public.add_item_to_order(p_order_id uuid, p_menu_id uuid, p_jumlah integer, p_id_toko uuid) TO service_role;


--
-- Name: FUNCTION can_submit_tenant_registration(in_email text, in_phone text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.can_submit_tenant_registration(in_email text, in_phone text) TO anon;
GRANT ALL ON FUNCTION public.can_submit_tenant_registration(in_email text, in_phone text) TO authenticated;
GRANT ALL ON FUNCTION public.can_submit_tenant_registration(in_email text, in_phone text) TO service_role;


--
-- Name: FUNCTION current_user_is_superadmin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.current_user_is_superadmin() TO anon;
GRANT ALL ON FUNCTION public.current_user_is_superadmin() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_is_superadmin() TO service_role;


--
-- Name: FUNCTION generate_slug(t text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_slug(t text) TO anon;
GRANT ALL ON FUNCTION public.generate_slug(t text) TO authenticated;
GRANT ALL ON FUNCTION public.generate_slug(t text) TO service_role;


--
-- Name: FUNCTION handle_item_unavailable(p_detail_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_item_unavailable(p_detail_id uuid) TO anon;
GRANT ALL ON FUNCTION public.handle_item_unavailable(p_detail_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.handle_item_unavailable(p_detail_id uuid) TO service_role;


--
-- Name: FUNCTION normalize_phone(input text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalize_phone(input text) TO anon;
GRANT ALL ON FUNCTION public.normalize_phone(input text) TO authenticated;
GRANT ALL ON FUNCTION public.normalize_phone(input text) TO service_role;


--
-- Name: FUNCTION submit_order(p_id_toko uuid, p_id_meja uuid, p_nama_pelanggan text, p_tipe_pesanan text, p_total_harga numeric, p_metode_pembayaran text, p_id_kasir uuid, p_items jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.submit_order(p_id_toko uuid, p_id_meja uuid, p_nama_pelanggan text, p_tipe_pesanan text, p_total_harga numeric, p_metode_pembayaran text, p_id_kasir uuid, p_items jsonb) TO anon;
GRANT ALL ON FUNCTION public.submit_order(p_id_toko uuid, p_id_meja uuid, p_nama_pelanggan text, p_tipe_pesanan text, p_total_harga numeric, p_metode_pembayaran text, p_id_kasir uuid, p_items jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.submit_order(p_id_toko uuid, p_id_meja uuid, p_nama_pelanggan text, p_tipe_pesanan text, p_total_harga numeric, p_metode_pembayaran text, p_id_kasir uuid, p_items jsonb) TO service_role;


--
-- Name: TABLE detail_pesanan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.detail_pesanan TO anon;
GRANT ALL ON TABLE public.detail_pesanan TO authenticated;
GRANT ALL ON TABLE public.detail_pesanan TO service_role;


--
-- Name: TABLE kategori; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kategori TO anon;
GRANT ALL ON TABLE public.kategori TO authenticated;
GRANT ALL ON TABLE public.kategori TO service_role;


--
-- Name: TABLE meja; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.meja TO anon;
GRANT ALL ON TABLE public.meja TO authenticated;
GRANT ALL ON TABLE public.meja TO service_role;


--
-- Name: TABLE menu; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.menu TO anon;
GRANT ALL ON TABLE public.menu TO authenticated;
GRANT ALL ON TABLE public.menu TO service_role;


--
-- Name: TABLE pesanan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pesanan TO anon;
GRANT ALL ON TABLE public.pesanan TO authenticated;
GRANT ALL ON TABLE public.pesanan TO service_role;


--
-- Name: TABLE tenant_registrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tenant_registrations TO anon;
GRANT ALL ON TABLE public.tenant_registrations TO authenticated;
GRANT ALL ON TABLE public.tenant_registrations TO service_role;


--
-- Name: TABLE toko; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.toko TO anon;
GRANT ALL ON TABLE public.toko TO authenticated;
GRANT ALL ON TABLE public.toko TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict kBgL2PdbfsPn92CJbMfcsh2DKouGeEcdpudSytqRUpqtv9XIoWeVC9f2BS3r65r

