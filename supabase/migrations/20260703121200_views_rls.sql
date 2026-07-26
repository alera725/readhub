-- RLS: VIEWS
-- INSERT: usuarios autenticados (únicamente como propios).
-- SELECT: solo administradores o el autor del artículo.
-- No hay política de UPDATE/DELETE: cada visualización es un evento
-- inmutable; RLS deniega ambas operaciones por defecto.

alter table public.views enable row level security;

create policy "Views: insert own view"
on public.views
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Views: select admin or article author"
on public.views
for select
to authenticated
using (
  public.is_admin()
  or public.is_article_author(article_id)
);
