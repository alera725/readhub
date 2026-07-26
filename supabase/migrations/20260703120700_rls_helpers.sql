-- Funciones auxiliares utilizadas por las políticas RLS.

-- ¿El usuario autenticado actual es admin?
-- SECURITY INVOKER: un usuario siempre puede leer su propia fila de profiles
-- (política de SELECT de profiles), por lo que no requiere privilegios elevados.
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

-- ¿El usuario autenticado actual es el autor del artículo indicado?
-- SECURITY DEFINER: consulta articles ignorando su política de SELECT
-- (que solo expone artículos públicos), para que un autor pueda demostrar
-- su autoría también sobre artículos no públicos (p. ej. borradores).
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

-- Evita que un usuario escale privilegios modificando su propio "role".
-- Solo aplica cuando el propio usuario autenticado edita su fila
-- (auth.uid() = old.id); las escrituras hechas sin sesión de usuario
-- (postgres/service_role, p. ej. seed.sql o herramientas de administración)
-- no quedan sujetas a esta restricción, ya que de por sí ya bypasean RLS.
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
