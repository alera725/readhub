-- RLS: FAVORITES
-- SELECT/INSERT/DELETE: solo el propietario.

alter table public.favorites enable row level security;

create policy "Favorites: select own favorite"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "Favorites: insert own favorite"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Favorites: delete own favorite"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);
