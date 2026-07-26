# Usar el servidor MCP de ReadHub

Las tareas de recuperación se apoyan en el conocimiento **real** publicado en
ReadHub. ReadHub expone ese conocimiento a través de su servidor MCP (la misma
capa RAG del producto: búsqueda semántica sobre `article_embeddings` + generación).
Tu trabajo es **usar** esas capacidades, no reimplementarlas.

## Regla de oro: descubrí, no asumas

Los nombres exactos de las Tools/Resources/Prompts pueden variar entre versiones
del servidor. Antes de la primera tarea de recuperación:

1. Mirá qué herramientas MCP de ReadHub están conectadas en esta sesión.
2. Elegí la que corresponda por su **intención** (buscar, comparar, traer un
   artículo), guiándote por el mapeo de abajo.
3. Si hay varias candidatas, preferí la de búsqueda semántica sobre la de listado
   plano; el objetivo es relevancia, no volcar el catálogo.

No inventes artículos, autores, citas ni cifras. Si una afirmación no proviene de un
resultado real del MCP, no la presentes como conocimiento de ReadHub.

## Mapeo tarea → capacidad MCP

ReadHub ya tiene, del lado del producto, estas capacidades (fases del RAG). El
servidor MCP las expone como Tools/Resources/Prompts; usá la que encaje:

| Tarea de la skill | Capacidad que necesitás | Equivalente en el producto |
| --- | --- | --- |
| Búsqueda de relacionados | Búsqueda semántica por consulta en lenguaje natural → Top-K artículos con similitud | `vector-search` / `match_articles` |
| Comparación con similares | Recuperar los Top-K y traer título/resumen (y cuerpo si aplica) de cada uno | recuperación + `get_article` |
| Detección de contradicciones | Recuperar afirmaciones sobre el mismo tema para contrastarlas con el borrador | recuperación (varias consultas) |
| Verificar contribución (en Planificación) | Búsqueda semántica del tema propuesto para ver qué ya existe | `vector-search` |
| Preguntas de fundamentación | Respuesta fundamentada con fuentes citadas | chat RAG (`ask`) |

Como **Resources**, ReadHub puede exponer artículos individuales o el listado; como
**Prompts**, plantillas del lado servidor (p. ej. "comparar borrador vs. artículo").
Si existen y encajan, preferílos antes que armar todo a mano — evita duplicar lógica.

## Cómo ejecutar cada tarea de recuperación

### Búsqueda de relacionados
1. Derivá 1–3 consultas en lenguaje natural desde la tesis/keywords del borrador
   (no una sola genérica: cubrí los ángulos principales).
2. Ejecutá la búsqueda semántica del MCP para cada consulta.
3. Consolidá, quitá duplicados y ordená por relevancia.
4. Presentá: título, de qué trata (1 línea), similitud/relevancia y por qué es
   pertinente para el borrador. Enlazá/identificá cada fuente.

### Comparación con similares
1. Partí de los relacionados más relevantes (máx. 3–5, para no diluir).
2. Para cada uno, traé su contenido consultable vía el MCP.
3. Compará contra el borrador en ejes útiles: enfoque, alcance, método, conclusión,
   novedad. Una tabla borrador-vs-artículos suele ser lo más claro.
4. Cerrá con: qué hace distinto/mejor el borrador y qué podría incorporar.

### Detección de contradicciones
1. Extraé del borrador sus **afirmaciones verificables** (claims), no las opiniones.
2. Para cada claim relevante, recuperá del corpus lo que se haya dicho sobre ese punto.
3. Marcá dónde el borrador **afirma lo contrario** a una fuente. Distinguí:
   contradicción real vs. matiz/contexto distinto vs. avance legítimo del estado del arte.
4. Presentá cada choque con: el claim del borrador, la fuente que difiere, y una
   recomendación (reforzar con evidencia, matizar, citar y diferenciarse, o corregir).
   Ver también `quality-guides.md` §4 para contradicciones **internas** del propio texto.

## Fallback: MCP de ReadHub no conectado

Si no hay ninguna herramienta de recuperación de ReadHub disponible en la sesión:

- **Decílo con claridad** al autor: las tareas de relacionados/comparación/
  contradicciones-contra-el-corpus necesitan el servidor MCP de ReadHub conectado, y
  no podés inventarlas.
- **Ofrecé lo que sí podés** sin el corpus: preparar las consultas de búsqueda, dejar
  los claims listos para contrastar, y avanzar con todas las tareas de autoría
  (planificación, esquema, redacción, claridad, redundancias, título, resumen,
  keywords, pre-publicación).
- No sustituyas la recuperación real por "conocimiento general" presentado como si
  viniera de ReadHub.
