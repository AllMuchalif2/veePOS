-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.detail_pesanan (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_pesanan uuid NOT NULL,
  id_toko uuid NOT NULL,
  id_menu uuid,
  jumlah integer NOT NULL,
  harga_satuan numeric NOT NULL,
  subtotal numeric NOT NULL,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT detail_pesanan_pkey PRIMARY KEY (id),
  CONSTRAINT detail_pesanan_id_pesanan_fkey FOREIGN KEY (id_pesanan) REFERENCES public.pesanan(id),
  CONSTRAINT detail_pesanan_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id),
  CONSTRAINT detail_pesanan_id_menu_fkey FOREIGN KEY (id_menu) REFERENCES public.menu(id)
);
CREATE TABLE public.kategori (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_toko uuid NOT NULL,
  nama text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT kategori_pkey PRIMARY KEY (id),
  CONSTRAINT kategori_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id)
);
CREATE TABLE public.meja (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_toko uuid NOT NULL,
  nomor_meja text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  status text DEFAULT 'tersedia'::text,
  CONSTRAINT meja_pkey PRIMARY KEY (id),
  CONSTRAINT meja_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id)
);
CREATE TABLE public.menu (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_toko uuid NOT NULL,
  id_kategori uuid,
  nama text NOT NULL,
  harga numeric NOT NULL,
  deskripsi text,
  foto_url text,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  tersedia boolean NOT NULL DEFAULT true,
  CONSTRAINT menu_pkey PRIMARY KEY (id),
  CONSTRAINT menu_id_kategori_fkey FOREIGN KEY (id_kategori) REFERENCES public.kategori(id),
  CONSTRAINT menu_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id)
);
CREATE TABLE public.pesanan (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_toko uuid NOT NULL,
  id_meja uuid,
  nama_pelanggan text,
  tipe_pesanan text NOT NULL CHECK (tipe_pesanan = ANY (ARRAY['dine_in'::text, 'takeaway'::text, 'qr_menu'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'diproses'::text, 'selesai'::text, 'dibatalkan'::text])),
  total_harga numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  nomor_pesanan text,
  id_kasir uuid,
  metode_pembayaran text,
  nominal_bayar numeric,
  kembalian numeric,
  CONSTRAINT pesanan_pkey PRIMARY KEY (id),
  CONSTRAINT pesanan_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id),
  CONSTRAINT pesanan_id_meja_fkey FOREIGN KEY (id_meja) REFERENCES public.meja(id),
  CONSTRAINT pesanan_id_kasir_fkey FOREIGN KEY (id_kasir) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.tenant_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenant_registrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.toko (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_toko text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT toko_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  id_toko uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'kasir'::text])),
  nama text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  email text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_id_toko_fkey FOREIGN KEY (id_toko) REFERENCES public.toko(id)
);