# ReadHub — Design System

Sistema visual del proyecto: tokens de Tailwind v4 (`app/globals.css`) + primitivos de Shadcn/UI (`components/ui/`). Inspirado en Medium, Dev.to y Hashnode — base neutra minimalista con un único color de acento, tarjetas con esquinas redondeadas, sombras sutiles y una tipografía editorial (serif en títulos, sans en UI/cuerpo).

Ningún componente aquí implementa lógica de negocio ni pantallas — son primitivos de presentación reutilizables consumidos por `components/{cards,forms,navigation,...}` en etapas posteriores.

---

## 1. Paleta de colores

Todos los colores viven como variables OKLCH en `app/globals.css` (`:root` / `.dark`), expuestas como tokens de Tailwind vía `@theme inline`. Ningún componente debe usar colores hardcodeados (`bg-blue-600`, `text-gray-500`, etc.) — siempre a través de estos tokens semánticos, para que el modo oscuro y futuros ajustes de marca se propaguen automáticamente.

### Filosofía

Un único **color de acento** (azul editorial) sobre una base neutra de grises — el mismo principio que el verde de Medium o el azul de Hashnode: el color se reserva para CTAs, links y estados de foco; el resto de la interfaz es monocromática para no competir con el contenido (los artículos).

### Tokens semánticos

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `background` / `foreground` | blanco / negro casi puro | navy muy oscuro / blanco casi puro | Lienzo base y texto principal |
| `primary` / `primary-foreground` | azul `oklch(0.546 0.245 262.881)` | azul claro `oklch(0.707 0.165 254.624)` | Botones principales, links, badges destacados |
| `secondary` / `secondary-foreground` | gris muy claro | gris oscuro | Superficies secundarias, botones no destacados |
| `muted` / `muted-foreground` | gris claro / gris medio | gris oscuro / gris claro | Texto secundario (fechas, metadatos), fondos discretos |
| `accent` / `accent-foreground` | gris con matiz azulado sutil | navy con matiz azulado sutil | Hover de menús/listas — un guiño de marca sin ser un CTA |
| `destructive` | rojo `oklch(0.577 0.245 27.325)` | rojo claro `oklch(0.704 0.191 22.216)` | Acciones destructivas, errores de validación |
| `border` / `input` | gris claro | blanco 10–15% opacidad | Bordes de tarjetas, inputs, separadores |
| `ring` | azul `oklch(0.623 0.214 259.815)` | azul claro (= `primary`) | Anillo de foco (accesibilidad de teclado) |
| `card` / `card-foreground` | blanco | navy oscuro (más claro que `background`, para diferenciarse) | Fondo de tarjetas/paneles |
| `sidebar*` | neutro con `sidebar-primary` = azul de marca | ídem en oscuro | Navegación lateral (si se usa) |

**Regla de accesibilidad:** todo texto sobre `primary`, `destructive` o `muted` debe usar su `-foreground` correspondiente — nunca combinar manualmente. `ring` y `primary` comparten familia de azul para que el estado de foco se perciba como una extensión del color de marca, no como un color ajeno.

---

## 2. Tipografía

| Variable | Fuente | Uso |
| --- | --- | --- |
| `--font-sans` (`font-sans`) | Geist Sans (`next/font/google`, vía `app/layout.tsx`) | UI, cuerpo de texto, formularios, navegación |
| `--font-serif` (`font-serif`) | Source Serif 4 (`next/font/google`) | Reservada para uso editorial puntual (p. ej. una cita destacada dentro de un artículo) |
| `--font-heading` = `--font-serif` | — | Todos los encabezados (`h1`–`h6`, `CardTitle`) — da el carácter "editorial" tipo Medium a cualquier título, incluidos los de las tarjetas de artículo |
| `--font-mono` (`font-mono`) | Geist Mono | Código, IDs, datos técnicos (poco uso esperado en esta app) |

### Escala (definida globalmente en `@layer base` — no requiere componentes)

| Elemento | Clase aplicada | Tamaño (mobile → desktop) |
| --- | --- | --- |
| `h1` | `font-heading font-semibold tracking-tight` | `text-4xl` → `text-5xl` |
| `h2` | ídem | `text-3xl` → `text-4xl` |
| `h3` | ídem | `text-2xl` → `text-3xl` |
| `h4` | ídem | `text-xl` → `text-2xl` |
| `h5` | ídem | `text-lg` |
| `h6` | ídem | `text-base` |
| `p` | `leading-relaxed` | tamaño heredado |

Cualquier `<h1>`–`<h6>` HTML nativo ya hereda esta jerarquía sin necesidad de clases adicionales — útil para el contenido de los artículos (Markdown/HTML renderizado) además de la UI.

---

## 3. Spacing

Se usa la escala nativa de Tailwind v4 (`--spacing: 0.25rem` por defecto, es decir `p-1` = 4px, `p-4` = 16px, etc.) — no se redefine, ya es consistente y suficientemente granular. Convenciones a seguir en los componentes de dominio:

- **Padding interno de tarjetas:** ya resuelto por `Card` vía la variable `--card-spacing` (`--spacing(4)` = 16px por defecto, `--spacing(3)` = 12px en `size="sm"`).
- **Separación entre secciones de página:** `gap-6` / `gap-8` (24–32px) entre bloques mayores (navbar → contenido, tarjeta → tarjeta en un grid).
- **Separación entre campos de formulario:** `gap-4` (16px) entre `Label` + `Input`, `gap-6` entre grupos de campos.
- **Padding horizontal de contenedor de página:** `px-4 md:px-6 lg:px-8`, con `max-w-*` centrado (`mx-auto`) para que el contenido editorial no se estire en pantallas anchas — patrón directo de Medium/Hashnode.

---

## 4. Border radius

Escala ya definida en `app/globals.css` (`@theme inline`), basada en `--radius: 0.625rem` (10px):

| Token | Valor | Uso típico |
| --- | --- | --- |
| `rounded-sm` | 6px | Badges pequeños, checkboxes |
| `rounded-md` | 8px | Inputs, botones pequeños |
| `rounded-lg` | 10px | Botones, inputs (tamaño por defecto) |
| `rounded-xl` | 14px | Tarjetas (`Card`), imágenes de portada |
| `rounded-2xl` / `3xl` / `4xl` | 18 / 22 / 26px | Contenedores grandes, badges tipo "pill" (`rounded-4xl`, ya usado por `Badge`) |

Esquinas generosamente redondeadas en todo el sistema — coincide directamente con "tarjetas con esquinas redondeadas" del brief.

---

## 5. Sombras (elevación)

Nuevos tokens `--shadow-xs/sm/md/lg/xl` agregados en `app/globals.css`, con opacidades más altas en modo oscuro (una sombra sutil en claro es invisible sobre fondo oscuro si no se compensa la opacidad).

| Token | Uso |
| --- | --- |
| `shadow-xs` | Elementos casi planos (inputs con foco leve) |
| `shadow-sm` | **Reposo de `Card`** (ya aplicado por defecto) — combinado con `ring-1 ring-foreground/10` para un borde nítido + elevación suave |
| `shadow-md` | Hover de tarjetas clickeables (`hover:shadow-md transition-shadow` — a aplicar en el componente de tarjeta de artículo) |
| `shadow-lg` / `xl` | Overlays flotantes: `dropdown-menu`, modales/`dialogs`, popovers |

Principio: sombras discretas en reposo, un salto perceptible pero no dramático en hover/focus — "sombras sutiles para resaltar elementos interactivos" sin saturar el diseño minimalista.

---

## 6. Componentes base (Shadcn/UI) instalados

Todos usan `class-variance-authority` + primitivos de `@base-ui/react`, ya con estados `hover` / `focus-visible` / `disabled` / `aria-invalid` resueltos vía clases utilitarias (no requieren trabajo adicional):

| Componente | Variantes | Estados incluidos |
| --- | --- | --- |
| `Button` | `default` `outline` `secondary` `ghost` `destructive` `link` × tamaños `xs` `sm` `default` `lg` `icon*` | hover (oscurece/atenúa bg), focus-visible (anillo azul), disabled (opacidad 50%, sin pointer-events), active (leve desplazamiento vertical) |
| `Input` | — | focus-visible (borde + anillo), disabled, `aria-invalid` (borde/anillo rojo) |
| `Textarea` | — | ídem `Input`, con `field-sizing-content` (crece con el contenido) |
| `Label` | — | atenuado si el control asociado está disabled |
| `Card` (+ `Header/Title/Description/Action/Content/Footer`) | tamaño `default` `sm` | sombra + anillo de borde; `CardTitle` usa la fuente serif de encabezados |
| `Badge` | `default` `secondary` `destructive` `outline` `ghost` `link` | hover (si es interactivo vía `render` como link) |
| `Avatar` (+ `Image/Fallback/Badge/Group/GroupCount`) | tamaño `sm` `default` `lg` | anillo de borde de contraste automático (`mix-blend-darken`/`lighten`) |
| `Separator` | horizontal/vertical | — |
| `DropdownMenu` | — | overlay con sombra/anillo, resaltado de ítem activo vía `accent` |

### Pendiente de instalar cuando se construyan las pantallas correspondientes

`Dialog` (confirmaciones, p. ej. cancelar publicación), `Alert`/`Toast` (confirmaciones visuales tras acciones exitosas — requerido por las reglas de navegación del laboratorio), `Skeleton` (estados de carga). No se instalan ahora para no anticipar componentes que aún no tienen consumidor.

---

## 7. Responsive

Mobile-first, breakpoints estándar de Tailwind (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px). Convención a seguir en las pantallas:

- **Navbar:** colapsa a un layout compacto por debajo de `md` (logo + menú hamburguesa u overflow), expandido con todos los elementos visibles desde `md` en adelante.
- **Grid de artículos:** 1 columna en mobile, 2 en `md`, 3 en `lg`/`xl` (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **Formularios (login/registro/publicación):** ancho completo en mobile, centrados con `max-w-md`/`max-w-lg` desde `sm` en adelante.
- **Artículo completo:** columna de lectura acotada (`max-w-prose` o `max-w-2xl`) para no sacrificar legibilidad en pantallas anchas — patrón directo de Medium.

---

## 8. Qué se tocó y qué no

**Modificado (infraestructura visual, no pantallas):**
- `app/globals.css` — paleta completa, tipografía, sombras, escala de encabezados.
- `app/layout.tsx` — se agregó la fuente serif (`Source Serif 4`) y se actualizó el `<title>`/`lang` (metadata global, no una pantalla).
- `components/ui/card.tsx` — se agregó `shadow-sm` + `transition-shadow` (una línea).
- `components/ui/` — se instalaron 7 componentes nuevos vía `npx shadcn add` (mismo estilo `base-nova` ya configurado en `components.json`).

**No tocado:**
- `app/page.tsx`, `app/(auth)/*`, `app/(dashboard)/*` — siguen vacíos/boilerplate, tal como se dejaron en el paso anterior.
- Todo lo relacionado con Supabase (migraciones, RLS, seed, servicios, hooks).
