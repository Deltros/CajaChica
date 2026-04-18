# Logo pack — caja chica

## Archivos

| Archivo | Uso |
|---|---|
| `logo.svg` | Icono-solo, 64×64. Para favicons, avatars, empty states. |
| `logo-lockup.svg` | Icono + wordmark + tagline. Para headers, landing, emails. |
| `logo.tsx` | Componente React (`<LogoMark />` y `<Logo />`) con props `size` y `showTagline`. Hereda `currentColor`. |
| `favicon.svg` | Variante con fondo crema `#F4EFE6` y esquinas redondeadas — lista para `/public/favicon.svg`. |

## Tokens

- **Tinta principal:** `#161410`
- **Tagline:** `#7A7063`
- **Fondo crema (favicon):** `#F4EFE6`
- **Wordmark:** Fraunces 600, `letter-spacing: -0.02em`
- **Tagline:** Geist 500, `letter-spacing: 0.22em`, UPPERCASE

## Integración sugerida (Next.js / Vite + React)

1. Copiá `logo.tsx` a `src/components/Logo.tsx`.
2. Copiá `favicon.svg` a `public/favicon.svg` y en tu `<head>`:
   ```html
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   ```
3. Asegurate de tener Fraunces y Geist cargadas (Google Fonts):
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
   ```
4. Uso:
   ```tsx
   import { Logo, LogoMark } from "@/components/Logo";

   // Header principal
   <Logo size={40} />

   // Sidebar colapsada / avatar
   <LogoMark size={28} />

   // Header compacto sin tagline
   <Logo size={32} showTagline={false} />
   ```

## Variables CSS que consume el componente

```css
:root {
  --ink: #161410;
  --muted: #7A7063;
}
```

Si ya tenés estas variables en tu `globals.css`, el logo toma los colores automáticamente.

## Zona de respeto

Dejá al menos **½ de la altura del icono** de espacio vacío alrededor del lockup. No lo encierres en cajas con bordes fuertes — el icono ya tiene su propio contorno.

## Prompt sugerido para Claude Code

```
Lee logo-pack/README.md y revisa los 4 archivos del pack (logo.svg,
logo-lockup.svg, favicon.svg, logo.tsx).

Implementa el logo en el proyecto:
1. Copia logo.tsx a src/components/Logo.tsx
2. Copia favicon.svg a public/favicon.svg y actualiza el <head>
3. Reemplaza el texto "caja chica" del header del dashboard por <Logo />
4. Asegúrate de que Fraunces y Geist estén cargadas en globals
5. Verifica que herede el color correcto en modo claro y oscuro

No modifiques la lógica de data fetching ni los cálculos.
Muéstrame los diffs antes de commitear.
```
