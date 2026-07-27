# ReadHub

Plataforma de publicación y lectura de artículos. Proyecto base construido con Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Shadcn/UI y Supabase.

Este documento cubre instalación y uso diario. Para el inventario técnico completo (arquitectura, modelo relacional, políticas RLS, integración Next.js↔Supabase, flujo de autenticación, estrategia de escalabilidad, y el detalle de cada archivo/función del proyecto), ver [ARCHITECTURE.md](ARCHITECTURE.md). Para la paleta de colores, tipografía, spacing, sombras y componentes base de UI, ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Puesta en marcha

```bash
npm install
npm run dev
```

Luego abrir <http://localhost:3000>. `.env.local` ya viene con la URL y la clave anónima del proyecto Supabase remoto (ambas públicas por diseño), así que la app funciona sin configuración adicional.

Usuarios de prueba (todos con contraseña `ReadHub123!`): `admin@readhub.dev`, `ana.writer@readhub.dev`, `bruno.writer@readhub.dev`, `carla.reader@readhub.dev`, `diego.reader@readhub.dev`. También se puede crear una cuenta nueva desde `/register` (el proyecto exige confirmar el email antes del primer login).

## Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **TailwindCSS v4**
- **Shadcn/UI**
- **Supabase** (Postgres, Auth, Storage)

## Estructura de carpetas

```
readhub/
├── app/                    # Rutas de Next.js (App Router)
├── components/
│   └── ui/                 # Componentes generados por Shadcn/UI
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Cliente de Supabase para el navegador
│   │   ├── server.ts       # Cliente de Supabase para Server Components/Actions
│   │   └── middleware.ts   # Refresco de sesión usado por el middleware raíz
│   ├── validators/         # Esquemas de validación (a incorporar por funcionalidad)
│   ├── utils/              # Utilidades genéricas (incluye el helper `cn`)
│   └── constants/          # Constantes de la aplicación
├── types/
│   ├── article.ts          # Tipos de Article, ArticleView, ArticleLike, ArticleFavorite
│   ├── user.ts              # Tipo Profile y roles de usuario
│   ├── comment.ts           # Tipo Comment
│   └── database.ts          # Tipos generados por Supabase (`supabase gen types typescript`)
├── supabase/
│   ├── migrations/         # Migraciones SQL versionadas (fuente de verdad del esquema)
│   ├── schema.sql           # Esquema relacional consolidado (snapshot de referencia)
│   ├── policies.sql         # Políticas RLS consolidadas (snapshot de referencia)
│   ├── seed.sql              # Datos de prueba: usuarios, artículos, comentarios, likes, views, favoritos
│   ├── tests/database/       # Tests pgTAP de las políticas RLS (uno por tabla)
│   └── config.toml           # Configuración del proyecto Supabase (CLI)
├── middleware.ts            # Middleware raíz de Next.js: refresca la sesión de Supabase
├── .env.example              # Variables de entorno requeridas
└── components.json           # Configuración de Shadcn/UI
```

## Configuración de Supabase

- `lib/supabase/client.ts`: crea un cliente de Supabase para uso en Client Components (`createBrowserClient`).
- `lib/supabase/server.ts`: crea un cliente de Supabase para Server Components y Server Actions, gestionando cookies con la API `cookies()` de Next.js.
- `lib/supabase/middleware.ts`: expone `updateSession`, usada por `middleware.ts` para refrescar el token de sesión en cada request.
- `middleware.ts`: middleware raíz de Next.js que invoca `updateSession` en todas las rutas, excluyendo assets estáticos.

## Base de datos

El esquema vive en `supabase/migrations/` (aplicado en orden por el CLI de Supabase) y se refleja como snapshot legible en `supabase/schema.sql`.

| Migración | Contenido |
| --- | --- |
| `20260703120000_extensions.sql` | Extensión `pgcrypto` (`gen_random_uuid()`) |
| `20260703120100_profiles.sql` | Enum `user_role`, tabla `profiles` (1:1 con `auth.users`), trigger `on_auth_user_created` que crea el perfil automáticamente al registrarse un usuario |
| `20260703120200_articles.sql` | Tabla `articles`, índice en `author_id` |
| `20260703120300_views.sql` | Tabla `views` (un evento por visualización), índice en `article_id` |
| `20260703120400_likes.sql` | Tabla `likes`, `UNIQUE(article_id, user_id)`, índice en `article_id` |
| `20260703120500_comments.sql` | Tabla `comments`, índice en `article_id` |
| `20260703120600_favorites.sql` | Tabla `favorites`, `UNIQUE(article_id, user_id)`, índice en `article_id` |

Todas las tablas (excepto `profiles`, que referencia `auth.users`) referencian `profiles(id)` para el usuario, y usan `ON DELETE CASCADE` para garantizar integridad referencial. `articles.is_public` se declaró `NOT NULL DEFAULT false`: un artículo nace como borrador y se publica explícitamente.

Comandos útiles (requieren Docker):

```bash
npx supabase start        # levanta Postgres + servicios locales
npx supabase db reset      # recrea la base ejecutando todas las migraciones + seed.sql
npx supabase gen types typescript --local > types/database.ts   # regenerar tipos
npx supabase stop           # detener el entorno local
```

## Datos de prueba (seed)

`supabase/seed.sql` se ejecuta automáticamente al final de `supabase db reset` (configurado en `supabase/config.toml`, sección `[db.seed]`). Corre como `postgres`, por lo que bypasea RLS igual que las migraciones.

Crea usuarios reales en `auth.users` + `auth.identities` (login funcional vía Supabase Auth, contraseña `ReadHub123!` para todos, solo desarrollo local):

| Email | Rol | Notas |
| --- | --- | --- |
| `admin@readhub.dev` | admin | Sin artículos propios; puede moderar comentarios y ver `views` de cualquier artículo |
| `ana.writer@readhub.dev` | writer | Autora de 2 artículos públicos + 1 borrador |
| `bruno.writer@readhub.dev` | writer | Autor de 1 artículo público + 1 borrador |
| `carla.reader@readhub.dev` | reader | Comenta, da like y guarda favoritos |
| `diego.reader@readhub.dev` | reader | Comenta y da like |

También incluye 5 artículos (3 públicos, 2 borradores `is_public = false`), 4 comentarios, 4 likes, 6 eventos de `views` (incluida una autora viendo su propio borrador) y 2 favoritos — todo respetando las restricciones `UNIQUE(article_id, user_id)` de `likes`/`favorites` y las claves foráneas.

Nota de implementación: `auth.users` tiene columnas (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`) sin default que deben insertarse como cadena vacía en vez de `NULL` — de lo contrario Supabase Auth falla al leer el usuario (`converting NULL to string is unsupported`). Verificado haciendo login real contra `/auth/v1/token` y consultando `/rest/v1/articles` con el JWT resultante.

## Seguridad (RLS)

Row Level Security está habilitado en las 6 tablas de `public`. Las políticas viven en `supabase/migrations/` y se reflejan como snapshot en `supabase/policies.sql`.

| Migración | Contenido |
| --- | --- |
| `20260703120650_grants.sql` | `GRANT` de tabla a `anon`/`authenticated` (requisito previo a RLS: sin GRANT, Postgres deniega antes de evaluar cualquier política) |
| `20260703120700_rls_helpers.sql` | `is_admin()`, `is_article_author()`, trigger `prevent_role_self_escalation` |
| `20260703120800_profiles_rls.sql` | Cada usuario ve/edita únicamente su propio perfil |
| `20260703120900_articles_rls.sql` | SELECT: solo `is_public = true`. INSERT: autenticado, como propio. UPDATE/DELETE: solo el autor |
| `20260703121000_comments_rls.sql` | SELECT: todos. INSERT: autenticado, propio. UPDATE: solo autor. DELETE: autor o admin |
| `20260703121100_likes_rls.sql` | SELECT/INSERT/DELETE: autenticado, acotado a las propias filas |
| `20260703121200_views_rls.sql` | INSERT: autenticado, propio. SELECT: admin o autor del artículo |
| `20260703121300_favorites_rls.sql` | SELECT/INSERT/DELETE: solo el propietario |
| `20260703121400_lockdown_function_execute.sql` | Revoca `EXECUTE` de `anon`/`authenticated`/`public` sobre `handle_new_user` y `prevent_role_self_escalation` (funciones de trigger, nunca deben invocarse como RPC), y sobre `is_article_author` salvo para `authenticated` (lo necesita la política de SELECT de `views`) |

Decisiones de diseño relevantes:

- **GRANT + RLS son complementarios.** El GRANT decide qué operaciones puede *intentar* un rol sobre una tabla; RLS decide qué *filas* puede tocar. El alcance de cada GRANT se limitó exactamente a lo que su política permite (principio de mínimo privilegio).
- **`is_article_author()` es `SECURITY DEFINER`** para poder confirmar autoría incluso sobre artículos no públicos (necesario para que el autor vea las estadísticas de `views` de sus propios borradores), sin depender de la política de SELECT de `articles` (que solo expone `is_public = true`).
- **Anti-escalada de privilegios en `profiles.role`:** dado que "cada usuario puede modificar su perfil" incluye la columna `role`, un `UPDATE` propio que intente cambiar `role` es revertido salvo que quien lo ejecuta ya sea admin. El trigger solo actúa cuando `auth.uid() = old.id` (edición de la propia fila desde una sesión de usuario), por lo que no interfiere con cargas hechas por `service_role`/`postgres` (seed, scripts de administración).
- **`likes` sí tiene política de SELECT** (acotada a `auth.uid() = user_id`), aunque el enunciado no la pedía explícitamente: Postgres exige privilegio `SELECT` sobre cualquier columna referenciada en el `WHERE` de un `DELETE` —independiente de RLS—, así que sin esta política el propio propietario no podría ejecutar un `DELETE ... WHERE article_id = X` realista sobre su propio like (solo un `DELETE FROM likes` a ciegas). Detectado ejecutando los tests, no por inspección del SQL.
- Validado con `supabase db reset` + `psql` simulando `anon`, `authenticated` (vía `request.jwt.claims`) y `service_role`/`postgres`, y con login real contra la API de Auth. Cobertura formal en `supabase/tests/database/` (ver sección siguiente).

## Despliegue al proyecto remoto

Las migraciones (esquema + RLS + lockdown de funciones, 16 de la sesión 2 + 4 de la sesión 3: funciones públicas de agregación y bucket de Storage — ver ARCHITECTURE.md §3.7.1/3.7.2) ya están aplicadas en el proyecto Supabase remoto (`otcnrrvcsbepzwuezave`, rama `main`), vía el MCP oficial de Supabase (`apply_migration`), no vía `supabase db push`.

`supabase/seed.sql` también se aplicó al remoto (vía `execute_sql` del MCP, ya que es DML y no una migración de esquema), a pedido explícito: el proyecto remoto es el único entorno de trabajo del laboratorio. El remoto tiene los mismos 5 usuarios de prueba, 5 artículos, 4 comentarios, 4 likes, 6 views y 2 favoritos que se validaron localmente. Contraseña de los 5 usuarios: `ReadHub123!` (ver tabla en la sección "Datos de prueba").

Los advisors de seguridad de Supabase (`get_advisors`) detectaron que `handle_new_user`, `is_article_author` y `prevent_role_self_escalation` quedaban expuestas como endpoints RPC públicos (`/rest/v1/rpc/<función>`) al ser `SECURITY DEFINER`. Se corrigió revocando `EXECUTE` de `anon`/`authenticated`/`public` en las dos funciones de trigger (no requieren ese privilegio para dispararse — verificado con un signup real) y en `is_article_author` salvo para `authenticated`, que sí lo necesita para evaluar la política de SELECT de `views`. Validado localmente (43/43 tests) antes y después de aplicar el fix al remoto.

Queda un advisor de seguridad esperado (INFO/WARN, no corregido a propósito): `is_article_author` sigue siendo invocable directamente por `authenticated` — es intencional, ya que solo devuelve un booleano sobre la propia autoría de quien llama y no expone datos de terceros.

Los advisors de *performance* (`auth_rls_initplan`: envolver `auth.uid()` en `(select auth.uid())` dentro de las políticas para evitar reevaluación por fila; e índices faltantes en columnas `user_id`) quedan pendientes como mejora opcional — no son errores de la implementación actual, son optimizaciones para escala que no se aplicaron para no exceder el alcance de esta etapa.

### Flujo de trabajo: Supabase Cloud como único entorno

El proyecto Supabase remoto (`otcnrrvcsbepzwuezave`) es el entorno de trabajo del laboratorio; no se usa un stack local de Docker en curso. Las migraciones, políticas y seed se validaron primero contra un Supabase local levantado con `supabase start` (Docker) antes de aplicarlas al remoto vía el MCP de Supabase — eso permitió detectar y corregir varios bugs (grants faltantes, el trigger de auto-escalada bloqueando el propio seed, SELECT faltante en `likes`, funciones `SECURITY DEFINER` expuestas) sin arriesgar el proyecto real. Una vez todo aplicado y confirmado en el remoto, los contenedores y volúmenes de Docker de ese entorno de prueba se apagaron y eliminaron (`supabase stop --no-backup`).

Los archivos de `supabase/migrations/`, `supabase/seed.sql` y `supabase/tests/database/` siguen siendo la fuente de verdad versionada — no son "artefactos de Docker"; Docker fue únicamente el runtime transitorio usado para probarlos. Si en el futuro hace falta volver a correr los tests pgTAP localmente, `npx supabase start` recrea ese entorno desde cero en minutos.

## Validación de las políticas RLS

Los tests viven en `supabase/tests/database/` como scripts pgTAP (`plan()` / `ok()` / `is()` / `throws_ok()` / `finish()`), uno por tabla. Se ejecutan con el CLI de Supabase, que instala `pgTAP` de forma efímera y corre cada archivo dentro de una transacción con `ROLLBACK` final (no dejan rastro en la base):

```bash
npx supabase test db                                            # corre todos los archivos
npx supabase test db supabase/tests/database/articles_test.sql   # corre uno en particular
```

Cada archivo cubre los escenarios pedidos —usuario autenticado, no autenticado, autor del recurso, usuario sin permisos, administrador— usando los IDs fijos de `supabase/seed.sql`, y cada aserción incluye el resultado esperado en su descripción:

| Archivo | Aserciones | Escenarios cubiertos |
| --- | --- | --- |
| `profiles_test.sql` | 6 | Ver perfil propio vs. ajeno, anon sin acceso, bloqueo de auto-escalada de `role`, edición de campos propios, admin |
| `articles_test.sql` | 9 | Anon/autenticado solo ven públicos, autor inserta/edita/elimina lo propio, terceros bloqueados, suplantación de `author_id` bloqueada |
| `comments_test.sql` | 7 | Lectura pública, autor edita lo propio, terceros bloqueados en editar/eliminar, admin elimina cualquiera, suplantación de `user_id` bloqueada |
| `likes_test.sql` | 7 | Anon bloqueado, SELECT acotado a lo propio, insert/delete propio, suplantación bloqueada, `UNIQUE(article_id, user_id)` |
| `views_test.sql` | 7 | Insert propio, suplantación bloqueada, autor ve stats de su borrador, terceros bloqueados, admin ve cualquiera, anon sin acceso |
| `favorites_test.sql` | 7 | Ver/agregar/eliminar lo propio, terceros bloqueados, anon sin acceso |

**43 aserciones en total, todas en verde** (`Result: PASS`). Dos de ellas surgieron de bugs reales encontrados al ejecutar los tests contra Supabase local (no de una revisión estática del SQL) y ya están corregidos en las migraciones correspondientes:

1. Faltaban los `GRANT` de tabla a `anon`/`authenticated` — sin ellos, Postgres deniega antes de evaluar cualquier política RLS.
2. La política de `likes` necesitaba SELECT acotado a las propias filas para que el propietario pudiera ejecutar un `DELETE` con `WHERE` (ver decisiones de diseño arriba).

### Validación adicional en SQL puro (sin pgTAP, sin Docker)

`supabase/rls_validation.sql` es una alternativa a los tests pgTAP pensada para correr directo contra el proyecto remoto — sin la extensión `pgtap` (no instalada ahí) ni un Postgres local. Son 22 bloques independientes (`begin; ... rollback;`), cada uno documentando el escenario y el resultado esperado, ejecutables uno por uno vía `execute_sql` del MCP de Supabase, `psql`, o el SQL Editor del dashboard.

Vive fuera de `supabase/tests/` a propósito: ese directorio lo escanea `supabase test db` (el runner de pgTAP) buscando un plan TAP en cada archivo, y este script no lo tiene — es SQL plano, no pgTAP. Si quedara adentro, `supabase test db` lo intentaría correr igual y fallaría con "No plan found in TAP output", aunque las 43 aserciones pgTAP reales sigan pasando.

Se ejecutaron los 22 contra el proyecto remoto con los datos reales de `seed.sql` — **todos con el resultado esperado**, y se confirmó que ninguna fila quedó alterada (conteos idénticos antes/después: 5 perfiles, 5 artículos, 4 comentarios, 4 likes, 6 views, 2 favoritos).

**Hallazgo relevante descubierto al correrlos contra el remoto:** Supabase Cloud otorga por defecto `GRANT` completo (`SELECT/INSERT/UPDATE/DELETE`) a `anon` y `authenticated` sobre las tablas nuevas — a diferencia del stack local vía CLI/Docker, que arranca sin ningún `GRANT` (por eso tuvimos que agregarlos explícitamente en `20260703120650_grants.sql`). Esto no abre ningún hueco de seguridad: cada política sigue restringiendo su `to <rol>` exactamente igual, pero cambia el *síntoma* de un acceso no autorizado:
- **Local:** `anon` leyendo `profiles` → error `permission denied` (falla a nivel de GRANT).
- **Remoto:** `anon` leyendo `profiles` → `0 filas`, sin error (el GRANT existe; RLS filtra en silencio porque ninguna política incluye `anon` en su `to`).

Los tests de `rls_validation.sql` reflejan el comportamiento real del remoto (esperan `0 filas`, no una excepción, en los casos de SELECT); los de `supabase/tests/database/*.sql` (pgTAP) reflejan el comportamiento del stack local (esperan la excepción). Ambos son correctos para su propio entorno — la seguridad efectiva (qué filas ve cada rol) es idéntica en los dos.

También se detectaron y corrigieron dos errores en el diseño de los tests mismos durante esta validación (no en las políticas): un caso donde dos `DELETE` sucesivos sobre la misma fila hacían ambigua la aserción final, y un caso donde el par `(article_id, user_id)` elegido para simular un "like ajeno" no existía en el seed — ambos corregidos directamente en `rls_validation.sql`.

## Variables de entorno

Copiar `apps/web/.env.example` a `apps/web/.env.local` y completar (Project Settings → API del proyecto de Supabase, y los paneles de OpenAI/Hugging Face para las claves de IA):

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto de Supabase (pública) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave anónima/pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (flujos de indexación) | Clave de servicio, solo servidor — persiste embeddings en `article_embeddings` (RLS sin políticas) |
| `OPENAI_API_KEY` | Sí (RAG) | Genera embeddings (`text-embedding-3-small`) |
| `HF_TOKEN` | Sí (chat RAG) | Token de Hugging Face, proveedor conversacional por defecto |
| `ARTICLE_WEBHOOK_SECRET` | Opcional | Secreto del Database Webhook de indexación automática (no activo en el remoto) |
| `AI_PROVIDER`, `HF_MODEL`, `OPENAI_EMBEDDING_MODEL` | Opcional | Overrides de proveedor/modelo |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Opcional | Solo si `AI_PROVIDER=anthropic` |

`.env.local` ya tiene cargadas la URL y la clave anónima reales del proyecto (`otcnrrvcsbepzwuezave`) — ambas son públicas por diseño (se envían al navegador), no son secretos.

## Scripts

```bash
npm run dev         # Servidor de desarrollo (Turbopack)
npm run build       # Build de producción
npm run start       # Servidor de producción
npm run lint        # Linter (turbo run lint en todos los workspaces)
npm run typecheck   # TypeScript --noEmit (turbo run typecheck)
npm run test        # Pruebas unitarias con Vitest (turbo run test)
npm run test:e2e    # Pruebas E2E con Playwright (apps/web)
```

## CI/CD

`.github/workflows/ci.yml` corre en cada `push` y `pull_request` (no despliega). Dos jobs:

| Job | Qué hace | Necesita secrets |
| --- | --- | --- |
| `quality` | `npm ci` → typecheck → lint → `npm run test` (71 pruebas unitarias) | No |
| `e2e` (depende de `quality`) | Compila la app (`npm run build && npm run start`), instala Chromium de Playwright y corre las pruebas E2E contra el proyecto Supabase remoto (auth, publish+like+comment, asistente RAG) | Sí |

Secrets a configurar en GitHub → Settings → Secrets and variables → Actions:

| Secret | Requerido | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Arranque de la app en el job `e2e` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Arranque de la app en el job `e2e` |
| `OPENAI_API_KEY` | Sí | `assistant.spec.ts` ejercita el asistente RAG real (embedding de la consulta) |
| `HF_TOKEN` | Sí | `assistant.spec.ts` ejercita el asistente RAG real (generación de la respuesta) |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional | Solo si algún flujo E2E ejercita indexación/embeddings de forma directa |
| `E2E_EMAIL`, `E2E_PASSWORD` | Opcional | Sobrescriben el usuario de prueba; por defecto usan el usuario sembrado en `supabase/seed.sql` (`carla.reader@readhub.dev`) |

El job `quality` no requiere ningún secret: typecheck, lint y las pruebas unitarias no acceden a Supabase ni a proveedores de IA (los clientes leen `process.env` recién al invocarse, y las pruebas los mockean).

## Estado del MVP

El MVP está **completo y funcional end-to-end**: registro, login, logout, persistencia de sesión, protección de rutas, listado de artículos, detalle con registro de visualización, publicación con carga de documento+imagen a Supabase Storage, comentarios y "me gusta" en tiempo real. Toda la información proviene de Supabase (Postgres + Auth + Storage) con RLS. La arquitectura sigue el patrón Componentes → Hooks → Services → Supabase (ver [ARCHITECTURE.md](ARCHITECTURE.md)).

Sobre la infraestructura de la etapa anterior (esquema, 20 migraciones, RLS, seed, tests pgTAP) se construyó la capa de presentación y lógica: sistema de diseño, layouts, navegación, componentes reutilizables, 4 services, 5 custom hooks y las pantallas (`(auth)` y `(dashboard)`).
