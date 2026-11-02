-- Ankara Taksi Analiz - Supabase (PostgreSQL) şeması
-- Supabase panelinde: SQL Editor > New query > bu dosyayı yapıştırıp Run

-- 1) TABLOLAR ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'driver' check (role in ('driver','admin')),
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plate text not null,
  brand text, model text,
  year int check (year between 1980 and 2100),
  fuel_type text,
  created_at timestamptz not null default now(),
  unique (user_id, plate)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  started_at timestamptz not null,
  region text not null,
  fare numeric(10,2) not null check (fare >= 0),
  trip_km numeric(8,1) not null check (trip_km >= 0),
  empty_km numeric(8,1) not null default 0 check (empty_km >= 0),
  created_at timestamptz not null default now()
);
create index on public.trips (user_id, started_at desc);
create index on public.trips (started_at, region);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  spent_on date not null,
  category text not null,
  amount numeric(10,2) not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now()
);
create index on public.expenses (user_id, spent_on desc);

-- Tüm kullanıcılara gösterilen ortak veri (trafik akışı)
create table public.traffic_snapshots (
  id bigint generated always as identity primary key,
  region text not null,
  level smallint not null check (level between 1 and 5), -- 1 çok akıcı ... 5 çok yoğun
  avg_speed_kmh numeric(5,1),
  source text not null default 'Elle girildi',
  observed_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.traffic_snapshots (region, observed_at desc);

-- 2) YARDIMCI FONKSİYONLAR --------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Yeni kullanıcı kaydolunca profil oluştur
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tüm sürücülerin anonim toplu talep verisi (kişi/plaka göstermez).
-- Bir saat-bölge hücresi en az 3 FARKLI sürücü içermiyorsa gösterilmez.
-- Test için 3 değerini 1 yapabilirsiniz.
create or replace function public.demand_by_hour_region()
returns table (hour int, region text, trip_count bigint, avg_fare numeric)
language sql security definer set search_path = public stable as $$
  select extract(hour from started_at at time zone 'Europe/Istanbul')::int,
         region, count(*), round(avg(fare), 0)
  from public.trips
  group by 1, 2
  having count(distinct user_id) >= 3
$$;
revoke execute on function public.demand_by_hour_region() from public, anon;
grant execute on function public.demand_by_hour_region() to authenticated;

-- 3) SATIR DÜZEYİNDE GÜVENLİK (RLS) -----------------------------------------
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.expenses enable row level security;
alter table public.traffic_snapshots enable row level security;

create policy "profil: kendi" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profil: kendi güncelle" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Kullanıcı rolünü kendi değiştiremesin: yalnızca full_name güncellenebilir
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
create policy "profil: admin hepsini okur" on public.profiles for select to authenticated
  using (public.is_admin());

create policy "araç: kendi" on public.vehicles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "yolculuk: kendi" on public.trips for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (vehicle_id is null or exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))));

create policy "gider: kendi" on public.expenses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (vehicle_id is null or exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))));

create policy "trafik: herkes okur" on public.traffic_snapshots for select to authenticated using (true);
create policy "trafik: admin yazar" on public.traffic_snapshots for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4) ADMİN ATAMA (kendi hesabınızı açtıktan sonra, e-postanızı yazıp çalıştırın)
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'ornek@mail.com');
