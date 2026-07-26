-- RLS: LIKES
-- INSERT: solo autenticado (únicamente como propio).
-- DELETE: solo propietario.
-- SELECT: solo las propias. El enunciado no especifica una política de
-- SELECT explícita, pero Postgres exige privilegio SELECT sobre cualquier
-- columna referenciada en la cláusula WHERE de un DELETE (independiente de
-- RLS); sin ella, ni el propio propietario podría ejecutar
-- `DELETE ... WHERE article_id = X`, solo un `DELETE FROM likes` a ciegas.
-- Se acota a las propias filas para no exponer los likes de otros usuarios.

alter table public.likes enable row level security;

create policy "Likes: select own like"
on public.likes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Likes: insert own like"
on public.likes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Likes: delete own like"
on public.likes
for delete
to authenticated
using (auth.uid() = user_id);
