# ReadHub — Documentación técnica

Estado actual del proyecto: infraestructura completa (Next.js + Supabase), sin funcionalidades de negocio ni UI de dominio (ver [Alcance y límites](#alcance-y-límites)). Este documento inventaria cada módulo, archivo y función existente, junto con el modelo relacional, las políticas RLS, la integración Next.js↔Supabase, el flujo de autenticación y la estrategia de escalabilidad.

Para instrucciones de instalación/ejecución día a día, ver [README.md](README.md).

---

## 1. Arquitectura general

ReadHub es una plataforma de publicación y lectura de artículos. La infraestructura combina:

- **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript** como frontend/SSR.
- **TailwindCSS v4** + **Shadcn/UI** como sistema de estilos/componentes.
- **Supabase** (Postgres + Auth + Storage) como backend: base de datos relacional, autenticación por email/password, y almacenamiento de archivos (previsto para `document_path`/`image_path` de `articles`, aún sin implementar).

El backend vive **enteramente en Supabase Cloud** (proyecto `otcnrrvcsbepzwuezave`): esquema, políticas de seguridad (RLS) y datos de prueba están aplicados ahí. No hay un backend propio en Next.js más allá de los clientes de Supabase — toda la lógica de acceso a datos pasa por PostgREST (API REST autogenerada de Supabase) sujeta a RLS, o por Supabase Auth.

---

## 2. Organización de carpetas

```
readhub/
├── app/                      # Next.js App Router (sin rutas de dominio todavía)
│   ├── layout.tsx             # Root layout — boilerplate de create-next-app, sin modificar
│   ├── page.tsx                # Página raíz — boilerplate de create-next-app, sin modificar
│   └── globals.css             # Estilos globales (Tailwind + tema de Shadcn)
├── components/
│   └── ui/
│       └── button.tsx           # Componente Button generado por Shadcn/UI
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente de Supabase para el navegador
│   │   ├── server.ts               # Cliente de Supabase para Server Components/Actions
│   │   └── middleware.ts             # Refresco de sesión usado por el middleware raíz
│   ├── validators/                    # Vacío (placeholder para esquemas de validación futuros)
│   ├── utils/
│   │   └── index.ts                    # Helper `cn` (merge de clases de Tailwind)
│   └── constants/
│       └── index.ts                     # Constantes de la app (APP_NAME, USER_ROLES)
├── types/
│   ├── database.ts                       # Tipos generados por Supabase (`generate_typescript_types`)
│   ├── article.ts                          # Article, ArticleView, ArticleLike, ArticleFavorite
│   ├── user.ts                              # Profile, UserRole
│   └── comment.ts                            # Comment
├── supabase/
│   ├── migrations/                           # 20 migraciones SQL versionadas (fuente de verdad del esquema)
│   ├── schema.sql                              # Esquema relacional consolidado (snapshot de referencia)
│   ├── policies.sql                             # Políticas RLS consolidadas (snapshot de referencia)
│   ├── seed.sql                                   # Datos de prueba (usuarios, artículos, comentarios, likes, views, favoritos)
│   ├── tests/
│   │   ├── database/                                # 6 archivos pgTAP (uno por tabla, requieren Docker local)
│   │   └── rls_validation.sql                          # Validación en SQL puro, corre directo contra el remoto
│   └── config.toml                                       # Configuración del proyecto Supabase (CLI)
├── middleware.ts                                          # Middleware raíz de Next.js
├── .env.example / .env.local                                # Variables de entorno
├── .mcp.json                                                  # Config del MCP de Supabase (project_ref)
└── components.json                                             # Configuración de Shadcn/UI
```

---

## 3. Inventario de archivos y funciones

### 3.1 `lib/supabase/` — clientes de Supabase

| Archivo | Función | Firma | Descripción |
| --- | --- | --- | --- |
| `client.ts` | `createClient()` | `() => SupabaseClient<Database>` | Crea un cliente de Supabase para **Client Components** usando `createBrowserClient` de `@supabase/ssr`. Lee `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `server.ts` | `createClient()` | `async () => Promise<SupabaseClient<Database>>` | Crea un cliente para **Server Components/Actions** usando `createServerClient`, leyendo/escribiendo cookies vía la API `cookies()` de `next/headers`. El `setAll` está envuelto en `try/catch` porque falla intencionalmente si se llama desde un Server Component puro (solo Server Actions/Route Handlers pueden escribir cookies). |
| `middleware.ts` | `updateSession(request)` | `(request: NextRequest) => Promise<NextResponse>` | Refresca el token de sesión en cada request llamando a `supabase.auth.getUser()`. Reescribe las cookies tanto en `request` como en la `NextResponse` devuelta. Es la función que usa el middleware raíz. |

### 3.2 `middleware.ts` (raíz)

| Export | Firma | Descripción |
| --- | --- | --- |
| `middleware(request)` | `(request: NextRequest) => Promise<NextResponse>` | Punto de entrada del middleware de Next.js; delega en `updateSession`. |
| `config` | `{ matcher: string[] }` | Excluye `_next/static`, `_next/image`, `favicon.ico` y assets de imagen del middleware. |

### 3.3 `lib/utils/` y `lib/constants/`

| Archivo | Export | Descripción |
| --- | --- | --- |
| `utils/index.ts` | `cn(...inputs)` | Combina `clsx` + `tailwind-merge`; usado por todos los componentes de Shadcn/UI para componer `className`. |
| `utils/index.ts` | `getInitials(name)`, `formatDate(value)`, `formatDateTime(value)` | Helpers de presentación compartidos (iniciales para avatares; fecha larga para artículos; fecha+hora para comentarios). Extraídos aquí para evitar duplicarlos entre `article-meta` y `comment-item`. |
| `constants/index.ts` | `APP_NAME`, `USER_ROLES`, `ALLOWED_DOCUMENT_MIME_TYPES`, `ALLOWED_IMAGE_MIME_TYPES` | Constantes de la aplicación; los MIME types espejan `allowed_mime_types` del bucket de Storage. |

### 3.4 `lib/validators/`

Vacío (solo `.gitkeep`). Reservado para esquemas de validación de formularios/inputs cuando se implementen las funcionalidades de negocio (fuera del alcance actual).

### 3.5 `types/` — tipos de dominio

| Archivo | Tipos exportados | Corresponde a |
| --- | --- | --- |
| `database.ts` | `Database`, `Json`, `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>`, `CompositeTypes<>` | Generado automáticamente (`supabase gen types typescript` / MCP `generate_typescript_types`) a partir del esquema real. Fuente de verdad para tipar cualquier query de Supabase. |
| `article.ts` | `Article`, `ArticleView`, `ArticleLike`, `ArticleFavorite` | Tablas `articles`, `views`, `likes`, `favorites` |
| `user.ts` | `UserRole`, `Profile` | Tabla `profiles` |
| `comment.ts` | `Comment` | Tabla `comments` |

### 3.6 `app/` y `components/`

- `layout.tsx`, `page.tsx`: boilerplate sin modificar de `create-next-app` (título "Create Next App"). No hay pantallas ni rutas de dominio — corresponde al alcance actual (ver §8).
- `components/ui/button.tsx`: componente `Button` generado por `shadcn` (variantes vía `class-variance-authority`), único componente de UI presente.

### 3.7 Funciones y triggers SQL (Postgres, schema `public`)

| Función | Firma | Seguridad | Uso |
| --- | --- | --- | --- |
| `handle_new_user()` | `() returns trigger` | `SECURITY DEFINER` | Trigger `on_auth_user_created` (AFTER INSERT en `auth.users`): crea la fila en `public.profiles` con `role` por defecto `'reader'`. |
| `is_admin()` | `() returns boolean` | `SECURITY INVOKER`, `STABLE` | Helper de RLS: `true` si `auth.uid()` tiene `role = 'admin'` en `profiles`. Usado en las políticas de DELETE de `comments` y de SELECT de `views`. |
| `is_article_author(target_article_id uuid)` | `(uuid) returns boolean` | `SECURITY DEFINER`, `STABLE` | Helper de RLS: `true` si `auth.uid()` es `author_id` del artículo indicado, **incluso si no es público** (bypasea la política de SELECT de `articles`, que solo expone `is_public = true`). Usado en la política de SELECT de `views`. |
| `prevent_role_self_escalation()` | `() returns trigger` | `SECURITY DEFINER` | Trigger `profiles_prevent_role_self_escalation` (BEFORE UPDATE en `profiles`): revierte cualquier cambio de `role` hecho por el propio usuario autenticado (`auth.uid() = old.id`) salvo que ya sea admin. No afecta escrituras de `service_role`/`postgres` (seed, scripts de administración). |

`EXECUTE` sobre estas cuatro funciones está revocado para `anon`/`authenticated`/`public` (migración `lockdown_function_execute`), salvo `is_article_author`, que mantiene `EXECUTE` para `authenticated` porque la política de `views` la necesita para evaluarse en nombre del usuario que consulta.

### 3.7.1 Funciones públicas de agregación (sesión 3 — capa Services)

Añadidas al implementar `services/`, no como parte del esquema original de la sesión 2. Motivo: `profiles` no tiene columna de nombre (ni la tuvo nunca — el formulario de registro del laboratorio tampoco la pide) y `auth.users` no es accesible vía RLS/PostgREST; además, las políticas de SELECT de `likes` (propio) y `views` (admin o autor) impiden mostrar un conteo agregado a terceros. Todas son `SECURITY DEFINER`, `STABLE`, solo exponen exactamente el dato necesario para la UI pública (nunca las filas), y respetan la visibilidad real del artículo (público, propio o admin) — no amplían el acceso que ya permite RLS, solo lo resuelven en una función en vez de una política.

| Función | Retorna | Uso |
| --- | --- | --- |
| `get_article_likes_count(uuid)` | `bigint` | Conteo de likes de un artículo (0 si no es visible para quien consulta) |
| `get_article_views_count(uuid)` | `bigint` | Conteo de views de un artículo (mismo criterio) |
| `get_article_author_email(uuid)` | `text` | Email del autor de un artículo (`null` si no es visible) — usado como "autor" a falta de un campo de nombre |
| `get_public_articles()` | tabla (artículo + `author_email` + `likes_count` + `views_count`) | Listado de la página principal en una sola consulta (evita N+1 llamadas por artículo) |
| `get_article_comments(uuid)` | tabla (comentario + `author_email`) | Hilo de comentarios de un artículo en una sola consulta |

Migraciones: `20260703121500_public_stats_functions.sql`, `20260703121700_article_author_email_function.sql`, `20260703121800_public_listing_functions.sql`. `EXECUTE` otorgado solo a `authenticated` (la app no muestra nada a `anon`, todo vive detrás del login).

### 3.7.2 Storage

Bucket privado `media` (creado en `20260703121600_storage_media_bucket.sql` — no existía en la sesión 2, Storage nunca formó parte de esa infraestructura). `file_size_limit` 10 MB, `allowed_mime_types` acotado a texto plano/PDF/DOCX e imágenes comunes. Convención de rutas: `{auth.uid()}/{article_id}/document.<ext>` y `{auth.uid()}/{article_id}/cover.<ext>`. Políticas de `storage.objects`: INSERT/UPDATE/DELETE acotados a la propia carpeta (primer segmento = dueño); SELECT permite la propia carpeta o cualquier archivo cuyo artículo (segundo segmento = `article_id`) sea público, propio o el consultante sea admin — mismo criterio que las funciones de la sección anterior.

### 3.8 `services/` — capa de acceso a Supabase

Único lugar del frontend que llama a Supabase (tablas, RPC o Storage). Cada función recibe el cliente (`SupabaseClient<Database>`) como parámetro — no crea uno propio — para funcionar indistintamente con el cliente de navegador, de servidor o del middleware.

| Archivo | Funciones | Descripción |
| --- | --- | --- |
| `auth.service.ts` | `signUp`, `signIn`, `getCurrentUser`, `signOut`, `onAuthStateChange` | `signUp` completa `birth_date`/`phone` en `profiles` tras el registro (el trigger `handle_new_user` ya crea la fila) solo si hay sesión activa — depende de si el proyecto exige confirmación de email. `onAuthStateChange` envuelve la suscripción de Supabase Auth para que `useAuth` no toque `supabase.auth` directamente. |
| `article.service.ts` | `getPublicArticles`, `getArticleById`, `getArticleStats`, `createArticle`, `recordArticleView`, `getOwnLike`, `likeArticle`, `unlikeArticle` | `getPublicArticles` usa la función `get_public_articles()` (un solo round-trip); `getArticleStats` resuelve autor/likes/views de un artículo individual en paralelo. |
| `comment.service.ts` | `getArticleComments`, `createComment` | `getArticleComments` usa `get_article_comments(uuid)`. |
| `storage.service.ts` | `uploadArticleDocument`, `uploadArticleImage`, `getSignedFileUrl`, `deleteArticleFile` | Sube al bucket `media` con la convención de rutas de la sección 3.7.2; las lecturas usan `createSignedUrl` (URL temporal), no un bucket público. |

Ningún componente ni hook debe llamar a `supabase.*` directamente — siempre a través de estas funciones.

### 3.9 `hooks/` — lógica de negocio (Custom Hooks)

Único lugar donde vive la lógica de negocio del frontend (validaciones, orquestación de varias llamadas a Services, estado de carga/envío/error, actualizaciones optimistas). Cada hook crea su propio cliente de Supabase vía `lib/supabase/client` y llama exclusivamente a `services/` — nunca a `supabase.*` directamente. Ninguno implementa pantallas; son consumidos por componentes que se construirán después.

| Hook | Consume | Responsabilidad |
| --- | --- | --- |
| `useAuth` | `auth.service` | Sesión actual (`onAuthStateChange`), `signIn`, `signUp`, `signOut`, con `loading`/`isSubmitting`/`error` |
| `useArticles` / `useArticle` | `article.service`, `auth.service` | Listado público (Flujo 4) y detalle de un artículo con registro automático de visualización best-effort (Flujo 5) |
| `useLikes` | `article.service`, `auth.service` | Estado propio de "me gusta" + conteo, con actualización optimista y reversión si falla (Flujo 8) |
| `useComments` | `comment.service`, `auth.service` | Listado y publicación de comentarios sin recargar la página (Flujo 7) |
| `useUpload` | `article.service`, `storage.service`, `auth.service` | Valida título/documento/imagen (Flujo 6), genera el `article_id` antes de subir archivos (necesario por la convención de rutas de Storage), sube documento+portada y crea el artículo |

---

## 4. Modelo relacional

### 4.1 Entidades

| Tabla | PK | Columnas | Relación |
| --- | --- | --- | --- |
| `profiles` | `id uuid` (= `auth.users.id`) | `birth_date`, `phone`, `role (enum user_role)`, `created_at` | 1:1 con `auth.users` |
| `articles` | `id uuid` | `author_id`, `title`, `summary`, `document_path`, `image_path`, `created_at`, `is_public` | N:1 con `profiles` (autor) |
| `comments` | `id uuid` | `article_id`, `user_id`, `comment`, `created_at` | N:1 con `articles`, N:1 con `profiles` |
| `likes` | `id uuid` | `article_id`, `user_id`, `created_at` | N:1 con `articles`/`profiles`; `UNIQUE(article_id, user_id)` |
| `views` | `id uuid` | `article_id`, `user_id`, `viewed_at` | N:1 con `articles`/`profiles`; sin `UNIQUE` (evento repetible) |
| `favorites` | `id uuid` | `article_id`, `user_id`, `created_at` | N:1 con `articles`/`profiles`; `UNIQUE(article_id, user_id)` |

Todas las FK usan `ON DELETE CASCADE`. `articles.is_public` es `NOT NULL DEFAULT false` (nace borrador). El enum `user_role` = `'reader' | 'writer' | 'admin'`.

### 4.2 Índices

`articles.author_id`, `views.article_id`, `likes.article_id`, `comments.article_id`, `favorites.article_id` (los pedidos explícitamente por la especificación). Los advisors de Supabase señalan como mejora opcional (no aplicada) agregar índices también en las columnas `user_id` de `comments`/`likes`/`views`/`favorites`.

**RAG** (ver sección 10): `article_embeddings.article_id` (btree, para el UPSERT/borrado por artículo) y `article_embeddings_embedding_hnsw_idx` (**HNSW** con `vector_cosine_ops`, para la búsqueda por similitud coseno).

### 4.3 Extensiones

`pgcrypto` (habilitada en la migración `extensions`), usada para `gen_random_uuid()` en todas las claves primarias. **`vector`** (pgvector, schema `extensions`) para el almacenamiento y la búsqueda de embeddings del RAG (sección 10).

---

## 5. Políticas RLS implementadas

RLS está habilitado en las 6 tablas de `public`. Resumen (detalle completo con SQL en `supabase/policies.sql`):

| Tabla | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `profiles` | Propio (`auth.uid() = id`) | — (vía trigger) | Propio | — (cascada desde `auth.users`) |
| `articles` | Públicos (`is_public = true`), `anon`+`authenticated` | Propio (`author_id = auth.uid()`) | Propio | Propio |
| `comments` | Todos, `anon`+`authenticated` | Propio | Propio | Propio o `is_admin()` |
| `likes` | Propio | Propio | — | Propio |
| `views` | `is_admin()` o `is_article_author(article_id)` | Propio | — | — |
| `favorites` | Propio | Propio | — | Propio |

Decisiones de diseño no explícitas en el enunciado original (documentadas también en README.md):

- **`likes` tiene SELECT** (acotado a lo propio) aunque el enunciado solo pedía INSERT/DELETE: Postgres exige `SELECT` sobre cualquier columna referenciada en el `WHERE` de un `DELETE`, independiente de RLS.
- **Anti-escalada de privilegios** en `profiles.role` vía trigger, ya que la política de UPDATE por sí sola no puede restringir columnas individuales.
- **GRANT + RLS son complementarios** — el GRANT habilita la operación a nivel de tabla; RLS decide qué filas. En Supabase Cloud, `anon`/`authenticated` ya tienen GRANT completo por defecto (a diferencia del stack local vía CLI, que arranca sin ninguno); la seguridad real depende de la cláusula `to <rol>` de cada política, no del GRANT.

---

## 6. Integración Next.js ↔ Supabase

Se usa el patrón oficial de `@supabase/ssr` con tres clientes diferenciados por contexto de ejecución:

1. **Navegador** (`lib/supabase/client.ts`): para Client Components que necesiten leer/escribir con la sesión del usuario en el browser.
2. **Servidor** (`lib/supabase/server.ts`): para Server Components y Server Actions, con acceso a las cookies de la request vía la API de Next.js.
3. **Middleware** (`lib/supabase/middleware.ts` + `middleware.ts` raíz): refresca el token de sesión (`auth.getUser()`) en cada request antes de que llegue a cualquier Server Component, evitando que la sesión expire silenciosamente durante la navegación SSR.

Todas las queries pasan por PostgREST y quedan sujetas a RLS según el rol (`anon` o `authenticated`) que Supabase Auth asigna al JWT de la sesión.

---

## 7. Flujo de autenticación

1. Un usuario se registra (`supabase.auth.signUp`) o inicia sesión (`signInWithPassword`) contra Supabase Auth — no hay pantallas propias todavía, solo la infraestructura que las soportará.
2. Al crearse la fila en `auth.users`, el trigger `on_auth_user_created` ejecuta `handle_new_user()` y crea automáticamente el `profiles` correspondiente con `role = 'reader'`.
3. Supabase Auth emite un JWT; `auth.uid()` (usado en todas las políticas RLS) se resuelve a partir del claim `sub` de ese JWT.
4. En cada request a una ruta de Next.js, el middleware raíz llama a `updateSession`, que valida/refresca el JWT vía `auth.getUser()` y reescribe las cookies de sesión.
5. Cualquier cambio de rol (`profiles.role`) hecho por el propio usuario es revertido por `prevent_role_self_escalation()`, salvo que ya sea admin — el rol solo puede escalarse desde una cuenta con privilegios de admin (o directamente por `service_role`, p. ej. un panel de administración futuro).

---

## 8. Estrategia de escalabilidad

- **Separación de clientes por contexto** (browser/server/middleware) permite que el renderizado SSR y las mutaciones desde el cliente convivan sin duplicar lógica de sesión.
- **RLS como capa única de autorización**: las reglas de acceso viven en la base de datos, no en el código de la aplicación — cualquier cliente (app web, futura app móvil, scripts) hereda automáticamente la misma seguridad sin reimplementarla.
- **`views` como log de eventos, no contador**: cada visualización es una fila independiente; las estadísticas (vistas por artículo, por período, etc.) se calculan con `GROUP BY` en vez de mantener un contador mutable, evitando contención de escritura en artículos populares.
- **Migraciones versionadas y aplicadas vía CLI/MCP**: el esquema completo es reproducible desde cero (`supabase db reset` o `apply_migration` en orden), lo que permite crear entornos de *staging* o revertir cambios sin depender de backups manuales.
- **`favorites` ya modelada aunque no usada**: la tabla y sus políticas están listas desde el inicio para evitar una migración disruptiva cuando se implemente la funcionalidad.
- **Índices en las columnas de mayor cardinalidad de joins** (`article_id` en las tablas hijas) anticipando los patrones de consulta más frecuentes (listar comentarios/likes/views de un artículo).

---

## 9. Estado actual y funciones/módulos pendientes

**Implementado:** infraestructura completa de sesión 2 (esquema, 20 migraciones, RLS, Storage); sistema de diseño (paleta, tipografía, sombras, componentes base de Shadcn); estructura de navegación (Root/Auth/Dashboard layout, Navbar, protección de rutas vía middleware); componentes reutilizables (cards, forms, dialogs, comments, articles, estados de carga/error/vacío); capa `services/` completa (auth, article, comment, storage); los 5 Custom Hooks (`useAuth`, `useArticles`/`useArticle`, `useComments`, `useLikes`, `useUpload`); y el **flujo de autenticación completo y verificado end-to-end** contra el proyecto real: login, registro (con manejo de confirmación de email), logout, persistencia de sesión, protección de rutas, redirecciones automáticas, mensajes de error (traducidos al español) y de éxito — ver `app/(auth)/login/page.tsx` y `app/(auth)/register/page.tsx`.

**Hallazgo confirmado durante las pruebas:** el proyecto Supabase remoto **sí exige confirmación de email** antes de crear sesión (`signUp` devuelve `session: null`). La pantalla de registro maneja ambos casos: con sesión → redirige a `/` tras mostrar el mensaje de éxito; sin sesión → muestra "revisa tu correo" y un botón a `/login`, sin redirigir (no hay sesión que proteger).

**Corrección aplicada:** se eliminó `app/page.tsx` (boilerplate de `create-next-app`, nunca actualizado), que generaba un conflicto de rutas con `app/(dashboard)/page.tsx` — ambos resolvían a `/`. Verificado en el navegador: antes de la corrección, un login exitoso mostraba el boilerplate de Next.js en vez de nada; después, `/` resuelve correctamente al Dashboard (que sigue vacío, ver abajo).

**Página principal (`app/(dashboard)/page.tsx`) — implementada y verificada end-to-end.** Consume `useArticles()`, muestra el listado real desde Supabase (portada, título, resumen, autor, fecha, views, likes) en un grid responsive con estados de carga/error/vacío; cada tarjeta navega a `/article/{id}`. La portada se resuelve como URL firmada del bucket privado `media`.

**Formulario de publicación (`app/(dashboard)/upload/page.tsx`) — implementado y verificado end-to-end** contra el proyecto real: valida título/documento/imagen (TXT/DOCX/PDF + imagen; el formulario permanece abierto mostrando los errores si falla), sube documento e imagen a Supabase Storage, crea el artículo, redirige a `/` y el listado se refresca automáticamente mostrando el nuevo artículo. Verificado con una publicación real (subida a Storage 200, `INSERT articles` 201, redirección + re-fetch del listado, portada del nuevo artículo firmada 200); los datos de prueba se eliminaron después (artículo + archivos de Storage), dejando la base en su estado de seed (5 artículos, 0 archivos en `media`).

**Detalle de artículo (`app/(dashboard)/article/[id]/page.tsx`) — implementado y verificado end-to-end.** Usa `use(params)` (patrón de Next.js 15 + React 19 para desenvolver `params` en un Client Component) junto con `useArticle`, `useComments` y `useLikes`. Registra la visualización automáticamente, muestra imagen/documento (resueltos como URLs firmadas), autor, fecha, likes/views/comentarios, el hilo de comentarios completo con formulario para publicar uno nuevo, el botón de "me gusta" con actualización optimista, y un botón para volver al inicio.

Se extendió `useArticle` (antes solo devolvía `article`/`stats`) para resolver también `imageUrl`/`documentUrl` — mismo patrón de `resolveFileUrl` ya usado en `useArticles` para el listado.

Se creó `components/articles/document-viewer.tsx` para "mostrar el documento": renderiza `.txt` como texto plano (fetch + `<pre>`, con saltos de línea preservados), `.pdf` en un `<iframe>` (el navegador lo renderiza nativamente, sin librerías), y para `.docx` u otros formatos que el navegador no puede mostrar en línea, ofrece un botón "Abrir documento" — no se agregó ninguna librería de conversión de DOCX para no sumar una dependencia nueva solo para ese caso.

Verificado con una publicación real de principio a fin: subida de un `.txt` real → el contenido exacto se mostró en la pantalla de detalle con los saltos de línea intactos; el contador de likes en el header se actualizó reactivamente al dar "me gusta" (`0 → 1`) sin recargar la página; un comentario nuevo se guardó y apareció en el hilo; una visualización quedó registrada en `views` con el `user_id` real de la sesión. Los datos de prueba (artículo, archivos de Storage, comentario) se eliminaron después — la única fila que se dejó a propósito es la visualización adicional registrada sobre un artículo del seed, por ser un efecto real y esperado de la función que se estaba probando, no basura de prueba.

**Sesión 4 — Sistema RAG:** implementado e integrado sobre la base anterior (ver sección 10). No modifica ninguna funcionalidad de las sesiones previas.

---

## 10. Sistema RAG (Recuperación Aumentada por Generación)

Asistente conversacional que responde **únicamente** con el conocimiento publicado en ReadHub. Cadena con responsabilidades aisladas:

```
UI (components/chat) → useChat → /api/chat → chat.service ─┬─ vector-search.service → embedding.service → OpenAI
                                                           │        └→ match_articles (RPC) → pgvector
                                                           ├─ context-builder.service
                                                           └─ lib/ai (LlmProvider) → Hugging Face (Llama-3.3-70B)

Indexación: articles (INSERT/UPDATE/DELETE) → Database Webhook → /api/webhooks/articles → indexing.service → embedding.service → article_embeddings
```

### 10.1 Infraestructura vectorial (3 migraciones nuevas)

- `20260704120000_vector_extension.sql` — habilita `vector` en el schema `extensions`.
- `20260704120100_article_embeddings.sql` — tabla `article_embeddings` (`article_id` único FK→`articles` ON DELETE CASCADE, `embedding vector(1536)`, `model`, `content_hash`, timestamps), índice btree + **HNSW** coseno. **RLS habilitado sin políticas**: solo `service_role` escribe y `match_articles` lee.
- `20260704120200_match_articles_function.sql` — `match_articles(query_embedding, match_count, similarity_threshold)` `SECURITY DEFINER`: Top-K por distancia coseno respetando la visibilidad (`is_public OR author_id = auth.uid() OR is_admin()`). Solo `authenticated`.

### 10.2 Servicios (capa `services/`)

| Archivo | Responsabilidad | Reutiliza |
| --- | --- | --- |
| `embedding.service.ts` | Genera y persiste embeddings (OpenAI `text-embedding-3-small`). Compone el texto (título+resumen+contenido), extrae el cuerpo desde Storage (TXT/PDF/DOCX vía `mammoth`/`unpdf`), valida dimensión, UPSERT. Único que conoce OpenAI. | — |
| `indexing.service.ts` | Pipeline de indexación automática: detecta cambio, (re)genera y sincroniza el embedding; corto-circuito por `content_hash`; DELETE idempotente. | `embedding.service` |
| `vector-search.service.ts` | Recuperación: embedding de la consulta + `match_articles` → Top-K estructurado. Parámetros de ranking configurables. | `embedding.service` |
| `context-builder.service.ts` | Módulo puro: selecciona (piso de similitud, tope, dedup Jaccard), organiza y trunca por presupuesto; arma el prompt + las fuentes. | — |
| `chat.service.ts` | Orquesta el RAG (punto de entrada único). No re-implementa nada; short-circuit sin contexto (no llama al LLM). | `vector-search`, `context-builder`, `lib/ai` |

### 10.3 Proveedor de IA (`lib/ai/`)

Interfaz `LlmProvider` (`provider.ts`) aísla al proveedor de generación: **solo `chat.service` la consume**. Implementaciones: `huggingface.ts` (por defecto, `meta-llama/Llama-3.3-70B-Instruct` vía el router compatible con OpenAI) y `claude.ts` (alternativa). `index.ts` selecciona por `AI_PROVIDER`. Sustituir el proveedor = implementar otro `LlmProvider`, sin tocar `chat.service`. Las llamadas externas usan `lib/http.ts` (`fetchWithTimeout`).

### 10.4 Route Handlers, Hook y componentes

- `app/api/chat/route.ts` — transporte del asistente: autentica (`401` sin sesión) y delega en `chat.service`; **cero lógica**. Transmite la respuesta de forma progresiva (NDJSON).
- `app/api/webhooks/articles/route.ts` — receptor del Database Webhook (autenticado por `x-webhook-secret`) que dispara `indexing.service`. Configuración por entorno en `supabase/webhooks.sql`.
- `hooks/useChat.ts` — transporte + estado del historial (en memoria; preparado para persistir sin cambiar componentes).
- `components/chat/*` — `ChatWindow`, `ChatMessages`, `ChatMessage`, `ChatInput`, `ChatSources`, `TypingIndicator`. Pantalla en `app/(dashboard)/assistant`.

### 10.5 Variables de entorno (server-only)

`OPENAI_API_KEY` (embeddings), `HF_TOKEN` / `HF_MODEL` / `AI_PROVIDER` (chat), `SUPABASE_SERVICE_ROLE_KEY` (escritura de embeddings), `ARTICLE_WEBHOOK_SECRET` (webhook). Ninguna con prefijo `NEXT_PUBLIC_`.

### 10.6 Manejo de errores (degradación controlada)

Sin resultados relevantes → `chat.service` responde un mensaje explícito **sin** llamar al LLM. Fallo de embeddings/LLM/Supabase → excepción propagada → `/api/chat` responde `5xx` → `useChat` muestra el error en la UI. Las llamadas externas tienen timeout (`lib/http`). El webhook responde `5xx` ante fallos para que Supabase reintente (pipeline idempotente).

### 10.7 Observabilidad

Estrategia acorde al tamaño: `console.error` estructurado en los Route Handlers (con `articleId`/mensaje) y metadatos de proceso en `ChatResult.metadata` (modelo, conteos, tokens, `truncated`). Para producción se recomienda (no implementado) un logger con niveles y correlación por request.

## Alcance y límites

Ver la sección "Alcance de esta etapa" en [README.md](README.md) para el detalle completo de qué incluye y qué no incluye esta etapa del laboratorio.
