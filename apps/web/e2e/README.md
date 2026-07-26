# Pruebas E2E (Playwright)

Pruebas de extremo a extremo de la app web de ReadHub. Manejan el navegador real
contra la app corriendo (Playwright levanta el server según `playwright.config.ts`).

**Estado:** solo infraestructura. Todavía **no** hay specs (se agregan en la
siguiente fase). Los flujos previstos (según la estrategia de testing): auth,
home/listado, publicación, detalle de artículo, asistente y navegación/responsive.

## Estructura

```
e2e/
├── fixtures/        estado de autenticación (storageState), datos de apoyo
└── *.spec.ts        specs por flujo (se agregarán después)
```

## Ejecutar

```bash
# desde apps/web (o con -w @readhub/web desde la raíz)
npm run test:e2e            # headless
npm run test:e2e:ui        # modo UI interactivo
npm run test:e2e:report    # abre el último reporte HTML
```

Requiere Supabase activo y las variables de entorno de la app (`.env.local`),
ya que las pruebas ejercitan login, listado, etc. contra el backend real.

Local reutiliza un dev server si ya hay uno en `:3000`; si no, lo levanta.
En CI (`CI=1`) se levanta fresco, con reintentos y reporte HTML.
