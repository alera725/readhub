-- RLS: PROFILES
-- Cada usuario únicamente puede ver y modificar su propio perfil.
-- No hay política de INSERT/DELETE: el perfil se crea automáticamente vía
-- trigger (on_auth_user_created) y se elimina en cascada con auth.users.

alter table public.profiles enable row level security;

create policy "Profiles: select own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Profiles: update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
