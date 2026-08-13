# Expense Tracker Mobile - Design System

## Overview

The Design System provides a unified visual language and component library for the Expense Tracker mobile app. It's built on React Native, Expo, NativeWind v4, and TypeScript.

### Key Principles

1. **Shared Design Tokens**: Colors, typography, and spacing are shared with the web app
2. **Semantic Design**: Use semantic tokens (e.g., `bg-primary`) rather than hardcoded values
3. **FSD Architecture**: Generic components in `shared/ui`, domain-specific in their slices
4. **Accessibility First**: All interactive components support accessibility
5. **Platform Native**: Use Expo/native primitives where appropriate

## Architecture

```
src/
├── shared/
│   ├── ui/              # Generic UI primitives and components
│   ├── components/      # Domain-specific components (TODO: move to entities/features)
│   └── config/
│       └── theme/       # Theme configuration and context
├── entities/            # Domain entities (transaction, account, category)
├── features/            # Features (create-transaction, edit-transaction)
└── pages/               # Screen compositions
```

## Design Tokens

### Colors

Semantic colors mapped from web design system:

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-background` | #ffffff | #1a1a1a | Page background |
| `--color-foreground` | #1a1a1a | #fafafa | Primary text |
| `--color-primary` | #2d2d2d | #e5e5e5 | Primary actions |
| `--color-secondary` | #f5f5f5 | #404040 | Secondary actions |
| `--color-muted` | #f5f5f5 | #404040 | Subtle backgrounds |
| `--color-destructive` | #dc2626 | #ef4444 | Destructive actions |
| `--color-border` | #e5e5e5 | rgba(255,255,255,0.1) | Borders |
| `--color-success` | #16a34a | #22c55e | Success states |
| `--color-warning` | #ea580c | #f97316 | Warning states |

### Typography

| Variant | Size | Weight | Usage |
|---------|------|--------|-------|
| `display` | 48px | bold | Hero text |
| `h1` | 36px | bold | Page titles |
| `h2` | 30px | semibold | Section headers |
| `h3` | 24px | semibold | Subsections |
| `body` | 16px | regular | Body text |
| `body-sm` | 14px | regular | Secondary text |
| `caption` | 12px | regular | Labels, hints |
| `label` | 14px | medium | Form labels |
| `button` | 16px | medium | Button text |

### Spacing

Uses Tailwind's default spacing scale:
- `1`: 4px, `2`: 8px, `3`: 12px, `4`: 16px, `5`: 20px, `6`: 24px, etc.

### Border Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | 2px |
| `--radius-md` | 4px |
| `--radius-lg` | 10px |
| `--radius-xl` | 14px |

## Components

### Primitives

#### Box
Flexible View wrapper for layout and styling.

```tsx
<Box className="p-4 bg-card rounded-lg">
  <Text>Content</Text>
</Box>
```

#### Text
Typography with semantic variants.

```tsx
<Text variant="h1">Title</Text>
<Text variant="body">Body text</Text>
<Text variant="caption">Helper text</Text>
```

#### Stack / Row
Layout containers for vertical and horizontal alignment.

```tsx
<Stack gap="md" align="center">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</Stack>

<Row gap="sm" justify="between">
  <Text>Left</Text>
  <Text>Right</Text>
</Row>
```

#### Screen
Screen wrapper with safe areas.

```tsx
<Screen>
  <Stack gap="md" className="p-4">
    <Text variant="h1">Dashboard</Text>
  </Stack>
</Screen>
```

#### Icon
Icon component using Ionicons.

```tsx
<Icon name="search" size={20} />
<Icon name="chevron-back" color="text-primary" />
```

### Interactive Components

#### Button
Primary action button with variants.

```tsx
<Button variant="primary" text="Save" onPress={handleSave} />
<Button variant="outline" text="Cancel" onPress={handleCancel} />
<Button variant="destructive" text="Delete" loading={isDeleting} />
```

**Variants**: `primary`, `secondary`, `outline`, `ghost`, `destructive`
**Sizes**: `sm`, `md`, `lg`

#### IconButton
Icon-only button for actions.

```tsx
<IconButton
  icon="close"
  accessibilityLabel="Close dialog"
  onPress={handleClose}
/>
```

#### Input
Text input with label, error, and icons.

```tsx
<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
  error={error}
  leadingIcon="mail"
/>
```

### Display Components

#### Card
Container for grouped content.

```tsx
<Card variant="elevated">
  <Stack gap="sm">
    <Text variant="h3">Card Title</Text>
    <Text variant="body">Card content</Text>
  </Stack>
</Card>
```

**Variants**: `default`, `outlined`, `elevated`

#### Badge
Status or category indicator.

```tsx
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
```

#### Divider
Visual separator.

```tsx
<Divider />
<Divider orientation="vertical" />
```

### Domain-Specific Components

#### AmountInput
Specialized input for currency amounts.

```tsx
<AmountInput
  value={amount}
  onValueChange={setAmount}
  currencySymbol="$"
  label="Amount"
  precision={2}
/>
```

Features:
- Handles decimal separator based on locale
- Stores value as cents/minor units (integer)
- Validates min/max bounds
- Formats display with currency symbol

#### TransactionRow
Display a transaction in a list.

```tsx
<TransactionRow
  transaction={{
    id: "1",
    amount: -4550,
    description: "Grocery shopping",
    category: "Food",
    date: "2024-01-15",
    type: "expense"
  }}
  onPress={handlePress}
/>
```

## Theme Switching

The app supports light/dark themes. Theme is managed via `ThemeProvider`.

```tsx
import { useTheme } from "@/shared/config/theme"

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <Button onPress={() => setTheme("dark)}>
      Toggle theme
    </Button>
  )
}
```

## FSD Rules

### Component Placement

**Place in `shared/ui` when:**
- Generic, reusable across domains
- No domain-specific logic
- Pure UI component

Examples: `Button`, `Input`, `Card`, `Badge`, `Divider`

**Place in `entities/*/ui` when:**
- Related to a domain entity
- Uses entity-specific types
- Not generic enough for shared

Examples: `TransactionRow`, `AccountCard`, `CategoryPicker`

**Place in `features/*/ui` when:**
- Implements a feature use case
- Combines multiple entities
- Feature-specific behavior

Examples: `CreateTransactionForm`, `TransactionFilters`

### Dependency Rules

```
pages → features → entities → shared
```

Lower layers can import from higher layers, but not vice versa.

## Usage Examples

### Create a Screen

```tsx
import { Screen, Text, Stack, Card, Button } from "@/shared"

export function MyScreen() {
  return (
    <Screen>
      <Stack gap="md" className="p-4">
        <Text variant="h1">My Screen</Text>
        <Card>
          <Text variant="body">Content</Text>
        </Card>
        <Button variant="primary" text="Action" onPress={handleAction} />
      </Stack>
    </Screen>
  )
}
```

### Create a Form

```tsx
import { Input, Button, Stack } from "@/shared"

export function MyForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  return (
    <Stack gap="md">
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        leadingIcon="mail"
        keyboardType="email-address"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        leadingIcon="lock-closed"
        secureTextEntry
      />
      <Button variant="primary" text="Submit" onPress={handleSubmit} />
    </Stack>
  )
}
```

## Adding New Components

When adding a new component to `shared/ui`:

1. **Ask: Is it generic?** If domain-specific, place in entities or features
2. **Check for native/Expo alternative** - don't reinvent native controls
3. **Use semantic tokens** - no hardcoded colors or sizes
4. **Support accessibility** - add accessibilityRole, accessibilityLabel
5. **Handle states** - default, pressed, focused, disabled, loading, error
6. **Type the props** - export Props type for consumers
7. **Add index.ts** - barrel export with public API
8. **Update shared/ui/index.ts** - add to barrel export
9. **Document here** - add to this document

### Template

```tsx
// shared/ui/my-component/MyComponent.tsx
export interface MyComponentProps {
  // ... props
}

/**
 * MyComponent - Brief description
 *
 * Longer description if needed.
 *
 * @example
 * <MyComponent prop="value" />
 */
export function MyComponent(props: MyComponentProps) {
  // ... implementation
}
```

## NativeWind v4 Setup

The app uses NativeWind v4 for styling. Configuration:

1. **`tailwind.config.ts`** - Tailwind configuration with theme extension
2. **`app.css`** - CSS custom properties for design tokens
3. **Import in `_layout.tsx`** - CSS imported at app root
4. **`ThemeProvider`** - Wraps app for theme switching

## Color Tokens Source

Colors are adapted from `apps/web/src/style.css` (web app).
The web app uses oklch color space, converted to hex for React Native.

To update colors:
1. Update `apps/web/src/style.css`
2. Convert oklch values to hex
3. Update `apps/mobile/app.css`

## Icon System

Uses **Ionicons** from `@expo/vector-icons`.

[Browse available icons](https://icons.expo.fyi/)

Common icon names:
- Navigation: `chevron-back`, `chevron-forward`, `home`, `settings`
- Actions: `add`, `create`, `trash`, `search`, `close`
- Status: `checkmark-circle`, `alert-circle`, `information-circle`
- Inputs: `mail`, `lock-closed`, `eye`, `eye-off`

## Do's and Don'ts

### Do

- Use semantic tokens: `className="bg-primary"`
- Place components in correct FSD slice
- Support accessibility
- Type your props
- Use existing components before creating new ones

### Don't

- Hardcode colors: `className="bg-[#2563EB]"`
- Place domain components in `shared/ui`
- Create abstractions without clear value
- Duplicate native controls (DatePicker, Switch, Slider)
- Mix styling systems (NativeWind + StyleSheet) without reason

## Future Work

- [ ] Move `AmountInput`, `TransactionRow` to entities/features
- [ ] Add BottomSheet wrapper using `@gorhom/bottom-sheet`
- [ ] Add Tabs component
- [ ] Add Toast/Snackbar component
- [ ] Add Dialog/Modal component
- [ ] Add Checkbox/Switch components (native primitives)
- [ ] Create shared design tokens package
- [ ] Add component examples/Storybook
- [ ] Implement animation system
