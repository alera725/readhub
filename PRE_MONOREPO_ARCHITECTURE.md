# ReadHub — Estructura previa al monorepo (referencia histórica)

Este documento es complementario a [ARCHITECTURE.md](ARCHITECTURE.md) y no describe el estado actual del proyecto. Registra cómo estaba organizado ReadHub **antes** de la migración a Turborepo (Sesión 5, ver la sección 9 de ARCHITECTURE.md), durante las Sesiones 1 a 4: un único proyecto Next.js plano, sin `apps/`ni `packages/`.

## Árbol de carpetas (pre-monorepo)

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
│   ├── migrations/                           # Migraciones SQL versionadas (fuente de verdad del esquema)
│   ├── schema.sql                              # Esquema relacional consolidado (snapshot de referencia)
│   ├── policies.sql                             # Políticas RLS consolidadas (snapshot de referencia)
│   ├── seed.sql                                   # Datos de prueba (usuarios, artículos, comentarios, likes, views, favoritos)
│   ├── tests/
│   │   ├── database/                                # Archivos pgTAP (uno por tabla, requieren Docker local)
│   │   └── rls_validation.sql                          # Validación en SQL puro, corre directo contra el remoto
│   └── config.toml                                       # Configuración del proyecto Supabase (CLI)
├── middleware.ts                                          # Middleware raíz de Next.js
├── .env.example / .env.local                                # Variables de entorno
├── .mcp.json                                                  # Config del MCP de Supabase (project_ref)
└── components.json                                             # Configuración de Shadcn/UI
```

## Qué cambió con la migración a monorepo (Sesión 5)

La migración movió código existente a su nuevo hogar sin reescribir su lógica interna:

| Antes (raíz del proyecto) | Ahora |
| --- | --- |
| `app/`, `components/`, `middleware.ts` | `apps/web/app/`, `apps/web/components/`, `apps/web/middleware.ts` |
| `lib/supabase/` | `apps/web/lib/supabase/` (sin cambios) |
| `lib/utils/`, `lib/constants/` | `packages/shared/src/` |
| `types/` | `packages/types/src/` |
| — (no existía) | `packages/database/` (clientes admin/browser + services de auth/article/comment/storage) |
| — (no existía) | `packages/ai/` y `packages/rag/` (agregados en la Sesión 4, junto con el sistema RAG — ver sección 10 de ARCHITECTURE.md) |
| — (no existía) | `apps/mcp/` (servidor MCP, agregado en la Sesión 5 como segundo consumidor de `packages/*`) |
| `supabase/` | Sin cambios de ubicación |

Para la estructura y el inventario de archivos **vigentes**, ver [ARCHITECTURE.md](ARCHITECTURE.md).
