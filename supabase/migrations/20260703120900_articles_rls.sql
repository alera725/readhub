-- RLS: ARTICLES
-- SELECT: todos pueden leer artículos públicos.
-- INSERT: solo usuarios autenticados (y únicamente como propios).
-- UPDATE/DELETE: solo el autor.

alter table public.articles enable row level security;

create policy "Articles: select public articles"
on public.articles
for select
to anon, authenticated
using (is_public = true);

create policy "Articles: insert own article"
on public.articles
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "Articles: update own article"
on public.articles
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Articles: delete own article"
on public.articles
for delete
to authenticated
using (auth.uid() = author_id);
