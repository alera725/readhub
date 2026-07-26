-- Cierra la superficie de API expuesta por PostgREST para funciones internas.
-- Supabase expone toda función del schema public como endpoint RPC
-- (/rest/v1/rpc/<function>) si el rol tiene EXECUTE. Estas tres funciones
-- nunca deben invocarse directamente desde la API:
--   - handle_new_user / prevent_role_self_escalation: funciones de trigger
--     (Postgres las invoca internamente; no requieren EXECUTE del rol que
--     dispara el trigger, así que revocarlo no rompe su funcionamiento).
--   - is_article_author: helper interno usado solo dentro de la política de
--     SELECT de views. A "authenticated" se le mantiene el EXECUTE porque
--     evaluar esa política corre con los privilegios del rol que consulta;
--     revocárselo rompería la política. Solo se revoca para "anon", que no
--     tiene ninguna política/grant sobre views y no debería poder invocarla.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_self_escalation() from public, anon, authenticated;

-- Revocar de "public" quita también el EXECUTE por defecto que "authenticated"
-- heredaba implícitamente (nunca tuvo un GRANT propio); se lo devolvemos de
-- forma explícita porque la política de SELECT de views lo necesita para
-- evaluar is_article_author() en nombre del usuario autenticado.
revoke execute on function public.is_article_author(uuid) from public, anon, authenticated;
grant execute on function public.is_article_author(uuid) to authenticated;
