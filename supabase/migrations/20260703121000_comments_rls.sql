-- RLS: COMMENTS
-- SELECT: leer todos.
-- INSERT: crear autenticado (únicamente como propio).
-- UPDATE: editar solo autor.
-- DELETE: eliminar autor o admin.

alter table public.comments enable row level security;

create policy "Comments: select all"
on public.comments
for select
to anon, authenticated
using (true);

create policy "Comments: insert own comment"
on public.comments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Comments: update own comment"
on public.comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Comments: delete own comment or admin"
on public.comments
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());
