# Ejemplos de uso

Interacciones reales de referencia. Muestran el estilo esperado: entrar por la
etapa del autor, entregar algo concreto, justificar brevemente y ofrecer el
siguiente paso — sin imponerlo.

---

## Ejemplo 1 — Desde una idea difusa (planificación → esquema)

**Usuario:** "Quiero escribir algo sobre cómo usamos RLS en Postgres para
multi-tenant, pero no sé bien cómo encararlo."

**Claude (con la skill):**
1. Se orienta: confirma tipo (técnico), audiencia (devs backend) y etapa (idea).
2. Ejecuta **Planificación** (`workflow.md §1`): ayuda a formular la pregunta
   central ("¿Cómo aislar datos por tenant con RLS sin degradar el rendimiento?"),
   la contribución, y 4 preguntas guía.
3. Verifica contribución: usa la **búsqueda de ReadHub** (`readhub-mcp.md`) para ver
   qué hay publicado sobre RLS y evitar repetir.
4. Propone el **esquema** con la variante C (how-to) de `outline-template.md`,
   con la función de cada sección.
5. Cierra: "Tenés el brief y el esquema. ¿Arrancamos por el Contexto?"

## Ejemplo 2 — Revisión de un borrador (claridad + redundancias)

**Usuario:** "Ya tengo el borrador, ¿lo podés revisar? Siento que hay partes
confusas y repetidas." *(pega el texto)*

**Claude (con la skill):**
1. Detecta etapa: revisión. No reescribe todo; marca y sugiere.
2. Pasada de **claridad** (`quality-guides.md §1`): cita 3 oraciones difíciles con
   su ubicación y una reescritura "antes → después" y el porqué.
3. Pasada de **redundancias** (§3): señala que la intro y la conclusión repiten la
   misma definición; recomienda cuál conservar.
4. Respeta la voz: presenta cambios como propuestas.
5. Ofrece: "¿Querés que sigamos con coherencia entre secciones o con el título?"

## Ejemplo 3 — Fundamentación contra el corpus (relacionados + contradicciones)

**Usuario:** "Antes de publicar, ¿hay artículos parecidos en ReadHub y me contradigo
con alguno?"

**Claude (con la skill):**
1. **Relacionados** (`readhub-mcp.md`): deriva 3 consultas desde la tesis/keywords,
   corre la búsqueda semántica del MCP de ReadHub, consolida y presenta el Top con
   título, relevancia y por qué es pertinente.
2. **Contradicciones**: extrae los claims del borrador, recupera lo que el corpus dice
   de esos puntos, y marca un choque real distinguiéndolo de un simple matiz, con
   recomendación (matizar y citar la fuente que difiere).
3. Si el MCP de ReadHub **no** estuviera conectado, lo dice y ofrece dejar las
   consultas y los claims listos, sin inventar artículos.

## Ejemplo 4 — Metadatos de publicación (título + resumen + keywords)

**Usuario:** "El artículo está listo, ayudame con el título, el resumen y las
palabras clave."

**Claude (con la skill):**
1. **Títulos** (§5): 4 opciones etiquetadas (más descriptivo / más conciso / más
   orientado a resultado / más buscable) con criterio.
2. **Resumen** (§6): versión de portada (contexto → método → resultado → implicancia),
   autocontenida y fiel.
3. **Keywords** (§7): 6 términos, mezclando dominio y aporte, coherentes con título/resumen.
4. Ofrece cerrar con la **checklist de pre-publicación** (§8).

---

## Cuándo NO se activa (contraejemplos)

- "¿Qué dice el artículo de RLS que ya está publicado?" → es **lectura** (chat RAG),
  no autoría. La skill no interviene.
- "Escribime un mail a mi profe pidiendo prórroga." → no es un artículo de ReadHub.
- "¿Cómo configuro pgvector?" → soporte técnico general, no asistencia de autoría.
