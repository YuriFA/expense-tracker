# @expense-tracker/tokens

Shared design tokens for the Expense Tracker application.

## Overview

This package provides type-safe design tokens that are shared across web and mobile platforms. It is the **single source of truth** for all design system values.

## Installation

This package is part of the Expense Tracker monorepo and uses workspace dependencies.

```bash
# Already installed in apps/web and apps/mobile via workspace:*
pnpm install
```

## Usage

### Web (Vue + Tailwind CSS v4)

Import the CSS file to get CSS custom properties:

```css
/* In your main stylesheet */
@import "@expense-tracker/tokens/css";
```

Then use Tailwind classes that reference the tokens:

```vue
<template>
  <button class="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
    Click me
  </button>
</template>
```

### Mobile (React Native + Uniwind)

The preferred path is Uniwind `className` with token utilities - `apps/mobile/global.css`
is GENERATED from this package (see `pnpm --filter @expense-tracker/tokens gen:mobile-theme`),
so every token below is available as `bg-*` / `text-*` / `accent-*` classes:

```tsx
<View className="bg-background text-foreground p-4 rounded-lg">
  <Text className="text-h1">Title</Text>
</View>
```

Import the React Native hex tokens only for values that must be plain strings
(dynamic data colors, reanimated worklets):

```tsx
import { colors } from "@expense-tracker/tokens/react-native"

colors.light["brand-violet"]
```

## Available Tokens

### Colors

Palette direction: Pastel Playful Fintech with Soft-Brutalist influences -
warm paper background, ink lines/borders, indigo primary, pastel lavender
fills, plus a vivid brand accent palette.

Semantic color tokens for light and dark themes:

- `background`, `foreground`
- `card`, `card-foreground`
- `primary`, `primary-foreground`
- `secondary`, `secondary-foreground`
- `muted`, `muted-foreground`
- `accent`, `accent-foreground`
- `brand-indigo`, `brand-violet`, `brand-lilac`, `brand-orange`, `brand-green`, `brand-leaf`
- `destructive`, `destructive-foreground`
- `border`, `input`, `ring`
- `success`, `success-foreground`
- `warning`, `warning-foreground`

## Available Tokens

```typescript
import { colors } from "@expense-tracker/tokens"
// or for React Native:
import { colors } from "@expense-tracker/tokens/react-native"

colors.light.background  // Light mode background
colors.dark.primary       // Dark mode primary
```

### Spacing

Tailwind-compatible spacing scale:

```typescript
import { spacing } from "@expense-tracker/tokens"

spacing[0]    // "0"
spacing[1]    // "4px"
spacing[4]    // "16px"
spacing[8]    // "32px"
```

### Typography

Font families, sizes, weights, and predefined variants:

```typescript
import { fontFamily, fontSize, fontWeight, typography } from "@expense-tracker/tokens"

fontFamily.sans         // Font family stack
fontSize.base           // "16px"
fontWeight.medium       // "500"
typography.h1           // { fontSize, fontWeight, lineHeight }
typography.body         // { fontSize, fontWeight, lineHeight }
```

### Border Radius

Border radius tokens:

```typescript
import { borderRadius } from "@expense-tracker/tokens"

borderRadius.sm         // "calc(var(--radius) - 4px)"
borderRadius.lg         // "var(--radius)"
```

## Platform Support

### Web
- **Format**: oklch color space (modern, perceptually uniform)
- **Output**: CSS custom properties for Tailwind CSS v4
- **File**: `src/index.css`

### Mobile (React Native)
- **Format**: Hex color strings (React Native compatible)
- **Output**: JavaScript objects, plus the GENERATED Uniwind theme in `apps/mobile/global.css`
- **File**: `src/react-native.ts`
- **Generator**: `pnpm --filter @expense-tracker/tokens gen:mobile-theme`
  (drift check: `gen:mobile-theme:check`) - never edit the generated block by hand

## Adding New Tokens

1. **Define the token** in `src/tokens/*.ts` (oklch):
   ```typescript
   export const myNewToken = {
     value: "oklch(0.5 0.1 200)",
   } as const
   ```

2. **Add React Native version** in `src/tokens/*.rn.ts` (hex):
   ```typescript
   export const myNewTokenRN = {
     value: "#FF5733",
   } as const
   ```

3. **Export from index files**:
   - `src/index.ts` - for web (TypeScript + oklch)
   - `src/react-native.ts` - for mobile (hex format)
   - `src/index.css` - for web (CSS custom properties)

4. **Regenerate the mobile theme**: `pnpm --filter @expense-tracker/tokens gen:mobile-theme`

5. **Update documentation** in this README.

## Version History

### 1.0.0 (2025-01-13)
- Initial release
- Semantic color tokens (light/dark)
- Spacing scale
- Typography system
- Border radius tokens
- Platform-specific exports (web + React Native)

## Related Packages

- `@expense-tracker/web` - Web application
- `@expense-tracker/mobile` - Mobile application

## Contributing

When updating design tokens:

1. Update the token definitions in this package
2. The changes automatically propagate to both platforms
3. Test on both web and mobile before committing
4. Update this README if adding new token categories

## Color Space

We use **oklch** for the source color definitions because:

- Perceptually uniform (better than RGB/hex)
- Wide color gamut support
- Modern browser support
- Easy to manipulate (lightness, chroma, hue)

For React Native, we convert oklch to hex because React Native doesn't support oklch natively.

## License

Private package for Expense Tracker project.
