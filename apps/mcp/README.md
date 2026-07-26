# @readhub/mcp — servidor MCP de ReadHub

Servidor [Model Context Protocol](https://modelcontextprotocol.io) de ReadHub,
construido con el SDK oficial `@modelcontextprotocol/sdk`. Expone las capacidades
de ReadHub (consulta, búsqueda semántica, RAG y análisis) a cualquier cliente MCP,
**reutilizando los paquetes compartidos del monorepo** sin duplicar lógica.

## Arquitectura

```
apps/mcp/src/
├── index.ts          punto de entrada: crea el servidor y lo conecta a STDIO
├── server.ts         createServer(): inicializa McpServer y cablea los registros
├── context.ts        integración: agrupa los servicios compartidos + cliente
│                      Supabase (service_role) lazy y memoizado (getReadHubServices)
├── lib/
│   └── article-query.ts   helper compartido (texto de consulta de un artículo)
├── tools/            Tools (registerTools)
│   ├── *.tool.ts          básicas de consulta
│   └── analysis/*.tool.ts análisis avanzado
├── resources/        Resources (registerResources)
└── prompts/          Prompts / "Skills" (registerPrompts)
```

Regla transversal: cada capacidad recibe los `services` compartidos y obtiene el
cliente con `services.getSupabase()`. Ninguna accede a Supabase/Next directamente
ni depende de `@readhub/web` → totalmente desacoplado de la app web.

## Capacidades

**Tools (11)** — 5 de consulta (`list_articles`, `search_articles`, `get_article`,
`semantic_search_articles`, `ask_readhub`) + 6 de análisis (`compare_multiple_articles`,
`detect_similarities_and_differences`, `extract_main_themes`, `generate_global_summary`,
`map_article_relationships`, `build_research_context`).

**Resources (5 + 2 plantillas)** — `readhub://info`, `readhub://articles`,
`readhub://articles/{id}`, `readhub://authors`, `readhub://authors/{id}`,
`readhub://categories`, `readhub://stats`.

**Prompts / Skills (5)** — `summarize_article`, `explain_article`, `compare_articles`,
`generate_questions`, `extract_key_concepts`.

## Ejecutar

```bash
# desde la raíz del monorepo
npm run dev  -w @readhub/mcp     # tsx src/index.ts (STDIO)
npm run build -w @readhub/mcp    # tsc --noEmit (verificación de compilación)
```

Runtime con **tsx** (transpila los paquetes TS del monorepo). El protocolo viaja
por stdin/stdout (JSON-RPC); los logs van a **stderr** para no corromper el canal.

En vivo, las capacidades que consultan datos requieren las variables de entorno del
proyecto (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `OPENAI_API_KEY`,
`HF_TOKEN`); listar Tools/Resources/Prompts no accede a Supabase.

## Reutilización de paquetes compartidos

`@readhub/database` (datos + cliente admin) · `@readhub/rag` (embeddings, búsqueda,
contexto, chat) · `@readhub/ai` (LLM) · `@readhub/shared` (constantes/utilidades) ·
`@readhub/types` (tipos). El servidor no reimplementa lógica de negocio.
