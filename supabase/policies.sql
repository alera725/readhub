-- ============================================================================
-- ReadHub — Políticas RLS (snapshot de referencia)
-- ============================================================================
-- Este archivo es una vista consolidada y de solo lectura de la seguridad
-- a nivel de fila. NO se ejecuta directamente: la fuente de verdad son los
-- archivos versionados en supabase/migrations/, aplicados en orden mediante
-- el CLI de Supabase (`supabase db reset` / `supabase migration up`).
-- ============================================================================

-- ── GRANTs de tabla ──────────────────────────────────────────────────────
-- RLS controla QUÉ FILAS son visibles/modificables; estos GRANT controlan
-- qué OPERACIONES puede intentar cada rol. Sin ambos, las políticas no
-- tienen efecto (Postgres deniega antes de evaluar cualquier política).
grant usage on schema public to anon, authenticated;

grant select, update on public.profiles to authenticated;

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

grant select on public.comments to anon, authenticated;
grant insert, update, delete on public.comments to authenticated;

grant select, insert, delete on public.likes to authenticated;

grant select, insert on public.views to authenticated;

grant select, insert, delete on public.favorites to authenticated;

-- ── Funciones auxiliares ─────────────────────────────────────────────────
create function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.is_article_author(target_article_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.articles
    where id = target_article_id and author_id = auth.uid()
  );
$$;

create function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role <> old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ── PROFILES ─────────────────────────────────────────────────────────────
-- Cada usuario únicamente puede ver y modificar su propio perfil.
-- Sin política de INSERT/DELETE: el perfil se crea vía trigger
-- (on_auth_user_created) y se elimina en cascada con auth.users.
alter table public.profiles enable row level security;

create policy "Profiles: select own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Profiles: update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ── ARTICLES ─────────────────────────────────────────────────────────────
-- SELECT: todos pueden leer artículos públicos.
-- INSERT: solo autenticados (únicamente como propios).
-- UPDATE/DELETE: solo el autor.
alter table public.articles enable row level security;

create policy "Articles: select public articles"
on public.articles for select
to anon, authenticated
using (is_public = true);

create policy "Articles: insert own article"
on public.articles for insert
to authenticated
with check (auth.uid() = author_id);

create policy "Articles: update own article"
on public.articles for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Articles: delete own article"
on public.articles for delete
to authenticated
using (auth.uid() = author_id);

-- ── COMMENTS ─────────────────────────────────────────────────────────────
-- SELECT: leer todos. INSERT: autenticado (propio). UPDATE: solo autor.
-- DELETE: autor o admin.
alter table public.comments enable row level security;

create policy "Comments: select all"
on public.comments for select
to anon, authenticated
using (true);

create policy "Comments: insert own comment"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Comments: update own comment"
on public.comments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Comments: delete own comment or admin"
on public.comments for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

-- ── LIKES ────────────────────────────────────────────────────────────────
-- INSERT: solo autenticado (propio). DELETE: solo propietario.
-- SELECT: solo las propias. El enunciado no especifica una política de
-- SELECT explícita, pero Postgres exige privilegio SELECT sobre cualquier
-- columna referenciada en la cláusula WHERE de un DELETE (independiente de
-- RLS); sin ella, ni el propio propietario podría ejecutar
-- `DELETE ... WHERE article_id = X` sobre su propio like.
alter table public.likes enable row level security;

create policy "Likes: select own like"
on public.likes for select
to authenticated
using (auth.uid() = user_id);

create policy "Likes: insert own like"
on public.likes for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Likes: delete own like"
on public.likes for delete
to authenticated
using (auth.uid() = user_id);

-- ── VIEWS ────────────────────────────────────────────────────────────────
-- INSERT: autenticado (propio). SELECT: admin o autor del artículo.
-- Sin política de UPDATE/DELETE: cada visualización es un evento inmutable.
alter table public.views enable row level security;

create policy "Views: insert own view"
on public.views for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Views: select admin or article author"
on public.views for select
to authenticated
using (
  public.is_admin()
  or public.is_article_author(article_id)
);

-- ── FAVORITES ────────────────────────────────────────────────────────────
-- SELECT/INSERT/DELETE: solo el propietario.
alter table public.favorites enable row level security;

create policy "Favorites: select own favorite"
on public.favorites for select
to authenticated
using (auth.uid() = user_id);

create policy "Favorites: insert own favorite"
on public.favorites for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Favorites: delete own favorite"
on public.favorites for delete
to authenticated
using (auth.uid() = user_id);
