# NativeWind v4 Setup for Expense Tracker Mobile

## Current Configuration

The app uses **NativeWind v4** with the following setup:

### Files

1. **`global.css`** - Global styles with design tokens
   - Uses `@tailwind` directives (Tailwind v4 syntax)
   - Defines CSS variables for colors in `@theme` block
   - Supports light/dark themes

2. **`tailwind.config.ts`** - Tailwind configuration
   - Uses `nativewind/preset`
   - Extends theme with CSS variable references
   - Defines content paths

3. **`babel.config.js`** - Babel configuration
   - Uses `babel-preset-expo` with `jsxImportSource: "nativewind"`
   - Includes `nativewind/babel` preset

4. **`metro.config.js`** - Metro bundler configuration
   - Wraps config with `withNativeWind`
   - Points to `./global.css` as input

5. **`nativewind-env.d.ts`** - TypeScript declarations
   - Includes `nativewind/types`
   - Declares CSS module support

### Dependencies

**Runtime:**
- `nativewind: ^4.2.6`
- `tailwindcss: 4` (v4, not v3!)
- `react-native-reanimated: ~4.5.3` (required for animations)

**Development:**
- `typescript: ~6.0.3`
- `@types/react: ~19.2.2`

## Key Differences from NativeWind v3

1. **CSS Syntax**:
   - v3: Used standard CSS with `@layer` directives
   - v4: Uses `@tailwind` directives and `@theme` for CSS variables

2. **Tailwind Version**:
   - v3: Used Tailwind v3
   - v4: Requires Tailwind v4

3. **Configuration**:
   - v3: Required `content` paths in config
   - v4: Still requires `content` paths for file watching

4. **Metro Config**:
   - v3: Simple wrapping
   - v4: Requires `input: './global.css'` parameter

## Design Tokens

All design tokens are defined in `global.css` using CSS variables:

```css
@theme {
  /* Radius */
  --radius: 0.625rem;
  --radius-sm: calc(var(--radius) - 4px);
  /* ... */

  /* Light theme colors */
  --color-background: #FFFFFF;
  --color-primary: #2D2D2D;
  /* ... */
}

.dark {
  /* Dark theme overrides */
  --color-background: #1A1A1A;
  --color-primary: #E5E5E5;
  /* ... */
}
```

These are referenced in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      background: "var(--color-background)",
      primary: "var(--color-primary)",
      // ...
    }
  }
}
```

## Usage in Components

```tsx
// ✅ Correct - using className
<View className="bg-primary text-foreground p-4">
  <Text className="text-h1">Title</Text>
</View>

// ❌ Avoid - StyleSheet when NativeWind can do it
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2D2D2D", // Don't hardcode!
  },
});

// ✅ OK - StyleSheet for dynamic values
const styles = StyleSheet.create({
  container: {
    opacity: someDynamicValue, // Dynamic is OK
  },
});
```

## Theme Switching

The `ThemeProvider` manages theme state and applies classes:

```tsx
import { ThemeProvider, useTheme } from "@/shared/config/theme"

function App() {
  return (
    <ThemeProvider>
      <Screen />
    </ThemeProvider>
  )
}

function MyComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <Button onPress={() => setTheme("dark"}>
      Toggle Dark Mode
    </Button>
  )
}
```

## Common Issues and Solutions

### Issue: "Cannot find module" for CSS import

**Solution**: Make sure `nativewind-env.d.ts` includes:
```typescript
declare module '*.css' {
  const content: any
  export default content
}
```

### Issue: Styles not applying

**Solution**: Check that:
1. `global.css` is imported in `src/app/_layout.tsx`
2. Metro config has `input: './global.css'`
3. `tailwind.config.ts` includes correct `content` paths

### Issue: Dark mode not working

**Solution**: Check that:
1. `ThemeProvider` wraps the app
2. CSS variables are defined in both `@theme` and `.dark` blocks
3. Theme context is properly updating the DOM

### Issue: Metro bundler errors

**Solution**: Clear cache and restart:
```bash
rm -rf node_modules/.cache
bun start --clear
```

## Migration Notes

When following the [NativeWind v4 installation guide](https://www.nativewind.dev/docs/getting-started/installation):

1. **Do NOT rename to `app.css` if you already have `global.css`**
   - Update metro config to point to the correct file
   - Keep the CSS import in `_layout.tsx` matching your filename

2. **Keep your design tokens**
   - The guide shows minimal CSS
   - Your app needs the `@theme` block with color variables
   - Don't replace with the minimal example from the guide

3. **Tailwind v4 syntax**
   - Use `@tailwind` instead of `@tailwind base/components/utilities`
   - Use `@theme` for CSS variables (not `:root`)
   - This is the new Tailwind v4 syntax

## File Checklist

- [x] `global.css` - Exists with design tokens
- [x] `tailwind.config.ts` - Has `nativewind/preset` and `content` paths
- [x] `babel.config.js` - Has nativewind babel preset
- [x] `metro.config.js` - Has `withNativeWind` with correct `input`
- [x] `nativewind-env.d.ts` - Has types and CSS module declaration
- [x] `src/app/_layout.tsx` - Imports `global.css`
- [x] `package.json` - Has correct versions of dependencies

## Testing

To verify the setup works:

1. **TypeScript check**:
   ```bash
   bun run type-check
   ```

2. **Start development server**:
   ```bash
   bun start
   ```

3. **Test on device/simulator**:
   ```bash
   bun ios
   # or
   bun android
   ```

## Related Documentation

- [NativeWind v4 Docs](https://www.nativewind.dev/)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs/v4-beta)
- [Design System Docs](./DESIGN_SYSTEM.md)
- [Shared Tokens Package](../../packages/tokens/README.md)
