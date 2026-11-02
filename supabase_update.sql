-- MEVCUT projeniz için tek seferlik güncelleme (schema'yı daha önce çalıştırdıysanız bunu çalıştırın).
-- Kullanıcı e-postalarını profiles tablosuna kaydeder; yalnızca yönetici hepsini görebilir.
alter table public.profiles add column if not exists email text;

update public.profiles p set email = u.email
  from auth.users u where u.id = p.id and p.email is null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end $$;

drop policy if exists "profil: admin hepsini okur" on public.profiles;
create policy "profil: admin hepsini okur" on public.profiles for select to authenticated
  using (public.is_admin());
