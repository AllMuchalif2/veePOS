# Setup Supabase (Clone & Run)

## 1) Frontend env (captcha + supabase)
Copy `.env.example` to `.env` lalu isi:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

Lalu restart dev server:

```bash
npm run dev
```

## 2) Edge Function secret untuk captcha
Set secret Turnstile di Supabase:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=<turnstile-secret-key>
```

Deploy function registrasi:

```bash
supabase functions deploy submit-tenant-registration
```

## 3) Terapkan Skema Database & RLS Policy
Jika database Anda baru di-setup, buka file `db/schema.sql`, copy semua isinya, lalu jalankan di menu SQL Editor pada Dashboard Supabase Anda untuk membentuk tabel, fungsi, dan keamanan (RLS).

## 4) Verifikasi RLS sudah sinkron
Jalankan query ini di SQL Editor:

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;
```

Bandingkan hasilnya dengan kumpulan `CREATE POLICY` yang tertua di dalam file `db/schema.sql`.

## 5) Verifikasi captcha flow
- Buka landing page.
- Pastikan widget captcha muncul.
- Submit tenant registration.
- Jika token invalid, response harus error captcha.
- Jika valid, data masuk ke `public.tenant_registrations` status `pending`.

## 6) Opsional (query cepat debug)
Jika muncul error `Captcha key belum dikonfigurasi` di frontend:
- pastikan `VITE_TURNSTILE_SITE_KEY` ada di `.env`
- restart `npm run dev`

Jika function balas `Captcha belum dikonfigurasi di server`:
- pastikan `TURNSTILE_SECRET_KEY` sudah diset via `supabase secrets set`
- deploy ulang function
