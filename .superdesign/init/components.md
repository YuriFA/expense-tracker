# components.md — shared UI primitives (apps/web)

- Framework: Vue 3.5 `<script setup lang="ts">`, TypeScript.
- Component base: **reka-ui ^2** (Vue port of Radix) wrapped shadcn-vue-style; one folder per component under `apps/web/src/shared/ui/<name>/` with an `index.ts` public API (no top-level barrel).
- Styling: **Tailwind CSS v4** utilities only — zero `<style>` blocks in the whole app. Variants via `class-variance-authority` (cva), merging via `cn()` (`clsx` + `tailwind-merge`).
- Icons: `@lucide/vue` components used directly (`size-4` classes). Toasts: vue-sonner. Animations: `tw-animate-css` utility classes.
- All colors/radii resolve from CSS variables wired in `theme.md` (`--color-*` → `bg-primary`, `text-muted-foreground`, `rounded-lg`…). Light+dark token sets exist; the app currently renders light only.
- `data-testid` attributes are load-bearing (web test-ids: `quick-action-expense`, `sync-status-badge`, `guest-mode-indicator`, `donut-chart`, `donut-segment`, `local-db-booting`, `local-db-busy`, `transaction-row-author-<id>`).

Inventory (26 folders): alert-dialog, amount-field, badge, button, calendar, card, chip, dialog, donut-chart, dropdown-menu, empty-state, error-state, field, input, label, native-select, number-field, popover, range-calendar, select, separator, sheet, skeleton, sonner, spinner, tabs.

`cn()` helper — `apps/web/src/shared/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Full sources follow (tests excluded).

## alert-dialog

#### `apps/web/src/shared/ui/alert-dialog/AlertDialog.vue`
```vue
<script setup lang="ts">
import type { AlertDialogEmits, AlertDialogProps } from "reka-ui"
import { AlertDialogRoot, useForwardPropsEmits } from "reka-ui"

const props = defineProps<AlertDialogProps>()
const emits = defineEmits<AlertDialogEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <AlertDialogRoot v-slot="slotProps" data-slot="alert-dialog" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </AlertDialogRoot>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogAction.vue`
```vue
<script setup lang="ts">
import type { AlertDialogActionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { AlertDialogAction } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants, type ButtonVariants } from '@/shared/ui/button'
import { Spinner } from '../spinner'

const props = defineProps<
  AlertDialogActionProps & {
    class?: HTMLAttributes['class']
    variant: ButtonVariants['variant']
    size?: ButtonVariants['size']
    loading?: boolean
  }
>()

const delegatedProps = reactiveOmit(props, 'class', 'variant', 'size', 'loading')
</script>

<template>
  <AlertDialogAction
    v-bind="delegatedProps"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <Spinner v-if="props.loading" />
    <slot />
  </AlertDialogAction>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogCancel.vue`
```vue
<script setup lang="ts">
import type { AlertDialogCancelProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogCancel } from "reka-ui"
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = defineProps<AlertDialogCancelProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <AlertDialogCancel
    v-bind="delegatedProps"
    :class="cn(
      buttonVariants({ variant: 'outline' }),
      'mt-2 sm:mt-0',
      props.class,
    )"
  >
    <slot />
  </AlertDialogCancel>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogContent.vue`
```vue
<script setup lang="ts">
import type { AlertDialogContentEmits, AlertDialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from '@/shared/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<AlertDialogContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<AlertDialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      data-slot="alert-dialog-overlay"
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80"
    />
    <AlertDialogContent
      data-slot="alert-dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogDescription.vue`
```vue
<script setup lang="ts">
import type { AlertDialogDescriptionProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  AlertDialogDescription,
} from "reka-ui"
import { cn } from '@/shared/lib/utils'

const props = defineProps<AlertDialogDescriptionProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <AlertDialogDescription
    data-slot="alert-dialog-description"
    v-bind="delegatedProps"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <slot />
  </AlertDialogDescription>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogFooter.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="alert-dialog-footer"
    :class="
      cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogHeader.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="alert-dialog-header"
    :class="cn('flex flex-col gap-2 text-center sm:text-left', props.class)"
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogTitle.vue`
```vue
<script setup lang="ts">
import type { AlertDialogTitleProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogTitle } from "reka-ui"
import { cn } from '@/shared/lib/utils'

const props = defineProps<AlertDialogTitleProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <AlertDialogTitle
    data-slot="alert-dialog-title"
    v-bind="delegatedProps"
    :class="cn('text-lg font-semibold', props.class)"
  >
    <slot />
  </AlertDialogTitle>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/AlertDialogTrigger.vue`
```vue
<script setup lang="ts">
import type { AlertDialogTriggerProps } from "reka-ui"
import { AlertDialogTrigger } from "reka-ui"

const props = defineProps<AlertDialogTriggerProps>()
</script>

<template>
  <AlertDialogTrigger data-slot="alert-dialog-trigger" v-bind="props">
    <slot />
  </AlertDialogTrigger>
</template>
```

#### `apps/web/src/shared/ui/alert-dialog/index.ts`
```ts
export { default as AlertDialog } from "./AlertDialog.vue"
export { default as AlertDialogAction } from "./AlertDialogAction.vue"
export { default as AlertDialogCancel } from "./AlertDialogCancel.vue"
export { default as AlertDialogContent } from "./AlertDialogContent.vue"
export { default as AlertDialogDescription } from "./AlertDialogDescription.vue"
export { default as AlertDialogFooter } from "./AlertDialogFooter.vue"
export { default as AlertDialogHeader } from "./AlertDialogHeader.vue"
export { default as AlertDialogTitle } from "./AlertDialogTitle.vue"
export { default as AlertDialogTrigger } from "./AlertDialogTrigger.vue"
```


## amount-field

#### `apps/web/src/shared/ui/amount-field/AmountField.vue`
```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Field, FieldError } from '@/shared/ui/field'
import { NumberField, NumberFieldContent, NumberFieldInput } from '@/shared/ui/number-field'
import { formatMoney, DEFAULT_CURRENCY, type CurrencyCode } from '@/shared/lib/money'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    currency?: CurrencyCode
    errors?: string[]
    placeholder?: string
    class?: string
  }>(),
  {
    currency: DEFAULT_CURRENCY,
    errors: undefined,
    placeholder: undefined,
    class: undefined,
  },
)

const modelValue = defineModel<number | undefined>()

const { locale } = useI18n()
const defaultPlaceholder = computed(() =>
  formatMoney(10_000, props.currency, locale.value),
)
const placeholder = computed(() => props.placeholder ?? defaultPlaceholder.value)
</script>

<template>
  <Field :class="props.class" :data-invalid="!!props.errors?.length">
    <NumberField
      id="amount"
      v-model="modelValue"
      :locale
      :format-options="{
        style: 'currency',
        currency: props.currency,
        currencyDisplay: 'symbol',
        currencySign: 'accounting',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }"
      :min="0"
      :step="0.01"
    >
      <NumberFieldContent>
        <NumberFieldInput class="text-left px-2" :placeholder :aria-invalid="!!props.errors?.length" />
      </NumberFieldContent>
    </NumberField>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
```

#### `apps/web/src/shared/ui/amount-field/index.ts`
```ts
export { default as AmountField } from './AmountField.vue'
```


## badge

#### `apps/web/src/shared/ui/badge/Badge.vue`
```vue
<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { BadgeVariants } from '.'
import { reactiveOmit } from '@vueuse/core'
import { Primitive } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { badgeVariants } from '.'

const props = defineProps<
  PrimitiveProps & {
    variant?: BadgeVariants['variant']
    class?: HTMLAttributes['class']
  }
>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <Primitive
    data-slot="badge"
    :class="cn(badgeVariants({ variant }), props.class)"
    v-bind="delegatedProps"
  >
    <slot />
  </Primitive>
</template>
```

#### `apps/web/src/shared/ui/badge/index.ts`
```ts
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
```


## button

#### `apps/web/src/shared/ui/button/Button.vue`
```vue
<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '.'
import { Spinner } from '../spinner'

interface Props extends PrimitiveProps {
  type?: ButtonHTMLAttributes['type']
  // eslint-disable-next-line vue/require-default-prop
  variant?: ButtonVariants['variant']
  // eslint-disable-next-line vue/require-default-prop
  size?: ButtonVariants['size']
  // eslint-disable-next-line vue/require-default-prop
  class?: HTMLAttributes['class']
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  type: 'button',
})
</script>

<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    :type="props.type"
  >
    <Spinner v-if="loading" />
    <slot />
  </Primitive>
</template>
```

#### `apps/web/src/shared/ui/button/index.ts`
```ts
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: 'h-6 rounded-md gap-1 px-1 has-[>svg]:px-1',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
```


## calendar

#### `apps/web/src/shared/ui/calendar/Calendar.vue`
```vue
<script lang="ts" setup>
import type { CalendarRootEmits, CalendarRootProps, DateValue } from 'reka-ui'
import type { HTMLAttributes, Ref } from 'vue'
import type { LayoutTypes } from '.'
import { createReusableTemplate, reactiveOmit, useVModel } from '@vueuse/core'
import { CalendarRoot, useDateFormatter, useForwardPropsEmits } from 'reka-ui'
import { createYear, createYearRange, toDate } from 'reka-ui/date'
import { computed, toRaw } from 'vue'
import { cn } from '@/shared/lib/utils'
import { currentDay, toDateValue } from '@/shared/lib/date'
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNextButton,
  CalendarPrevButton,
} from '.'

const props = withDefaults(
  defineProps<
    CalendarRootProps & {
      // eslint-disable-next-line vue/require-default-prop
      class?: HTMLAttributes['class']
      layout?: LayoutTypes
      yearRange?: DateValue[]
    }
  >(),
  {
    modelValue: undefined,
    layout: undefined,
    yearRange: undefined,
  },
)
const emits = defineEmits<CalendarRootEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'layout', 'placeholder')

const placeholder = useVModel(props, 'placeholder', emits, {
  passive: true,
  defaultValue: props.defaultPlaceholder ?? toDateValue(currentDay()),
}) as Ref<DateValue>

const formatter = useDateFormatter(props.locale ?? 'en')

const yearRange = computed(() => {
  return (
    props.yearRange ??
    createYearRange({
      start:
        props?.minValue ??
        (toRaw(props.placeholder) ?? props.defaultPlaceholder ?? toDateValue(currentDay())).cycle(
          'year',
          -100,
        ),

      end:
        props?.maxValue ??
        (toRaw(props.placeholder) ?? props.defaultPlaceholder ?? toDateValue(currentDay())).cycle(
          'year',
          10,
        ),
    })
  )
})

const [DefineMonthTemplate, ReuseMonthTemplate] = createReusableTemplate<{ date: DateValue }>()
const [DefineYearTemplate, ReuseYearTemplate] = createReusableTemplate<{ date: DateValue }>()

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DefineMonthTemplate v-slot="{ date }">
    <div class="**:data-[slot=native-select-icon]:right-1">
      <div class="relative">
        <div class="absolute inset-0 flex h-full items-center text-sm pl-2 pointer-events-none">
          {{ formatter.custom(toDate(date), { month: 'short' }) }}
        </div>
        <NativeSelect
          class="text-xs h-8 pr-6 pl-2 text-transparent relative"
          :model-value="date.month"
          @change="
            (e: Event) => {
              placeholder = placeholder.set({
                month: Number((e?.target as any)?.value),
              })
            }
          "
        >
          <NativeSelectOption
            v-for="month in createYear({ dateObj: date })"
            :key="month.toString()"
            :value="month.month"
            :selected="date.month === month.month"
          >
            {{ formatter.custom(toDate(month), { month: 'short' }) }}
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  </DefineMonthTemplate>

  <DefineYearTemplate v-slot="{ date }">
    <div class="**:data-[slot=native-select-icon]:right-1">
      <div class="relative">
        <div class="absolute inset-0 flex h-full items-center text-sm pl-2 pointer-events-none">
          {{ formatter.custom(toDate(date), { year: 'numeric' }) }}
        </div>
        <NativeSelect
          class="text-xs h-8 pr-6 pl-2 text-transparent relative"
          :model-value="date.year"
          @change="
            (e: Event) => {
              placeholder = placeholder.set({
                year: Number((e?.target as any)?.value),
              })
            }
          "
        >
          <NativeSelectOption
            v-for="year in yearRange"
            :key="year.toString()"
            :value="year.year"
            :selected="date.year === year.year"
          >
            {{ formatter.custom(toDate(year), { year: 'numeric' }) }}
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  </DefineYearTemplate>

  <CalendarRoot
    v-slot="{ grid, weekDays, date }"
    v-bind="forwarded"
    v-model:placeholder="placeholder"
    data-slot="calendar"
    :class="cn('p-3', props.class)"
  >
    <CalendarHeader class="pt-0">
      <nav class="flex items-center gap-1 absolute top-0 inset-x-0 justify-between">
        <CalendarPrevButton>
          <slot name="calendar-prev-icon" />
        </CalendarPrevButton>
        <CalendarNextButton>
          <slot name="calendar-next-icon" />
        </CalendarNextButton>
      </nav>

      <slot
        name="calendar-heading"
        :date="date"
        :month="ReuseMonthTemplate"
        :year="ReuseYearTemplate"
      >
        <template v-if="layout === 'month-and-year'">
          <div class="flex items-center justify-center gap-1">
            <ReuseMonthTemplate :date="date" />
            <ReuseYearTemplate :date="date" />
          </div>
        </template>
        <template v-else-if="layout === 'month-only'">
          <div class="flex items-center justify-center gap-1">
            <ReuseMonthTemplate :date="date" />
            {{ formatter.custom(toDate(date), { year: 'numeric' }) }}
          </div>
        </template>
        <template v-else-if="layout === 'year-only'">
          <div class="flex items-center justify-center gap-1">
            {{ formatter.custom(toDate(date), { month: 'short' }) }}
            <ReuseYearTemplate :date="date" />
          </div>
        </template>
        <template v-else>
          <CalendarHeading />
        </template>
      </slot>
    </CalendarHeader>

    <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
      <CalendarGrid v-for="month in grid" :key="month.value.toString()">
        <CalendarGridHead>
          <CalendarGridRow>
            <CalendarHeadCell v-for="day in weekDays" :key="day">
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="mt-2 w-full"
          >
            <CalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
              <CalendarCellTrigger :day="weekDate" :month="month.value" />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarCell.vue`
```vue
<script lang="ts" setup>
import type { CalendarCellProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarCell, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<CalendarCellProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarCell
    data-slot="calendar-cell"
    :class="
      cn(
        'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 [&:has([data-selected])]:rounded-md [&:has([data-selected])]:bg-accent',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarCell>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarCellTrigger.vue`
```vue
<script lang="ts" setup>
import type { CalendarCellTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarCellTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = withDefaults(
  // eslint-disable-next-line vue/require-default-prop
  defineProps<CalendarCellTriggerProps & { class?: HTMLAttributes['class'] }>(),
  {
    as: 'button',
  },
)

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarCellTrigger
    data-slot="calendar-cell-trigger"
    :class="
      cn(
        buttonVariants({ variant: 'ghost' }),
        'size-8 p-0 font-normal aria-selected:opacity-100 cursor-default',
        '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
        // Selected
        'data-selected:bg-primary data-selected:text-primary-foreground data-selected:opacity-100 [&[data-selected]:hover]:bg-primary data-selected:hover:text-primary-foreground data-selected:focus:bg-primary data-selected:focus:text-primary-foreground',
        // Disabled
        'data-disabled:text-muted-foreground data-disabled:opacity-50',
        // Unavailable
        'data-unavailable:text-destructive-foreground data-unavailable:line-through',
        // Outside months
        'data-outside-view:text-muted-foreground',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarCellTrigger>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarGrid.vue`
```vue
<script lang="ts" setup>
import type { CalendarGridProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarGrid, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<CalendarGridProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarGrid
    data-slot="calendar-grid"
    :class="cn('w-full border-collapse space-x-1', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarGrid>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarGridBody.vue`
```vue
<script lang="ts" setup>
import type { CalendarGridBodyProps } from 'reka-ui'
import { CalendarGridBody } from 'reka-ui'

const props = defineProps<CalendarGridBodyProps>()
</script>

<template>
  <CalendarGridBody data-slot="calendar-grid-body" v-bind="props">
    <slot />
  </CalendarGridBody>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarGridHead.vue`
```vue
<script lang="ts" setup>
import type { CalendarGridHeadProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { CalendarGridHead } from 'reka-ui'

const props = defineProps<CalendarGridHeadProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <CalendarGridHead data-slot="calendar-grid-head" v-bind="props">
    <slot />
  </CalendarGridHead>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarGridRow.vue`
```vue
<script lang="ts" setup>
import type { CalendarGridRowProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarGridRow, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<CalendarGridRowProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarGridRow
    data-slot="calendar-grid-row"
    :class="cn('flex', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarGridRow>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarHeadCell.vue`
```vue
<script lang="ts" setup>
import type { CalendarHeadCellProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarHeadCell, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<CalendarHeadCellProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarHeadCell
    data-slot="calendar-head-cell"
    :class="cn('text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarHeadCell>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarHeader.vue`
```vue
<script lang="ts" setup>
import type { CalendarHeaderProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarHeader, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<CalendarHeaderProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarHeader
    data-slot="calendar-header"
    :class="cn('flex justify-center pt-1 relative items-center w-full px-8', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarHeader>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarHeading.vue`
```vue
<script lang="ts" setup>
import type { CalendarHeadingProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { CalendarHeading, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<CalendarHeadingProps & { class?: HTMLAttributes['class'] }>()

defineSlots<{
  default: (props: { headingValue: string }) => unknown
}>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarHeading
    v-slot="{ headingValue }"
    data-slot="calendar-heading"
    :class="cn('text-sm font-medium', props.class)"
    v-bind="forwardedProps"
  >
    <slot :heading-value>
      {{ headingValue }}
    </slot>
  </CalendarHeading>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarNextButton.vue`
```vue
<script lang="ts" setup>
import type { CalendarNextProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronRight } from '@lucide/vue'
import { CalendarNext, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = defineProps<CalendarNextProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarNext
    data-slot="calendar-next-button"
    :class="
      cn(
        buttonVariants({ variant: 'outline' }),
        'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot>
      <ChevronRight class="size-4" />
    </slot>
  </CalendarNext>
</template>
```

#### `apps/web/src/shared/ui/calendar/CalendarPrevButton.vue`
```vue
<script lang="ts" setup>
import type { CalendarPrevProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronLeft } from '@lucide/vue'
import { CalendarPrev, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = defineProps<CalendarPrevProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarPrev
    data-slot="calendar-prev-button"
    :class="
      cn(
        buttonVariants({ variant: 'outline' }),
        'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot>
      <ChevronLeft class="size-4" />
    </slot>
  </CalendarPrev>
</template>
```

#### `apps/web/src/shared/ui/calendar/index.ts`
```ts
export { default as Calendar } from './Calendar.vue'
export { default as CalendarCell } from './CalendarCell.vue'
export { default as CalendarCellTrigger } from './CalendarCellTrigger.vue'
export { default as CalendarGrid } from './CalendarGrid.vue'
export { default as CalendarGridBody } from './CalendarGridBody.vue'
export { default as CalendarGridHead } from './CalendarGridHead.vue'
export { default as CalendarGridRow } from './CalendarGridRow.vue'
export { default as CalendarHeadCell } from './CalendarHeadCell.vue'
export { default as CalendarHeader } from './CalendarHeader.vue'
export { default as CalendarHeading } from './CalendarHeading.vue'
export { default as CalendarNextButton } from './CalendarNextButton.vue'
export { default as CalendarPrevButton } from './CalendarPrevButton.vue'

export type LayoutTypes = 'month-and-year' | 'month-only' | 'year-only' | undefined
```


## card

#### `apps/web/src/shared/ui/card/Card.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        'bg-card text-card-foreground flex flex-col gap-2 rounded-xl border py-4 md:py-6 shadow-sm',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/card/CardAction.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="card-action"
    :class="cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', props.class)"
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/card/CardContent.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div data-slot="card-content" :class="cn('px-4 md:px-6', props.class)">
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/card/CardDescription.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <p data-slot="card-description" :class="cn('text-muted-foreground text-sm', props.class)">
    <slot />
  </p>
</template>
```

#### `apps/web/src/shared/ui/card/CardFooter.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div data-slot="card-footer" :class="cn('flex items-center px-6 [.border-t]:pt-6', props.class)">
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/card/CardHeader.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="card-header"
    :class="
      cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-4 md:px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/card/CardTitle.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <h3 data-slot="card-title" :class="cn('leading-none font-semibold', props.class)">
    <slot />
  </h3>
</template>
```

#### `apps/web/src/shared/ui/card/index.ts`
```ts
export { default as Card } from './Card.vue'
export { default as CardAction } from './CardAction.vue'
export { default as CardContent } from './CardContent.vue'
export { default as CardDescription } from './CardDescription.vue'
export { default as CardFooter } from './CardFooter.vue'
export { default as CardHeader } from './CardHeader.vue'
export { default as CardTitle } from './CardTitle.vue'
```


## chip

#### `apps/web/src/shared/ui/chip/Chip.vue`
```vue
<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Badge, type BadgeVariants } from '../badge'
import { Button } from '../button'
import { X } from '@lucide/vue'

const props = defineProps<
  PrimitiveProps & {
    variant?: BadgeVariants['variant']
    class?: HTMLAttributes['class']
  }
>()

const emit = defineEmits<{
  (event: 'remove'): void
}>()
</script>

<template>
  <Badge v-bind="props">
    <slot />
    <Button variant="ghost" size="xs" class="p-1 size-5! rounded-full" @click="emit('remove')">
      <X />
    </Button>
  </Badge>
</template>
```

#### `apps/web/src/shared/ui/chip/index.ts`
```ts
export { default as Chip } from './Chip.vue'
```


## dialog

#### `apps/web/src/shared/ui/dialog/Dialog.vue`
```vue
<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import { DialogRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DialogRootProps>()
const emits = defineEmits<DialogRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DialogRoot v-slot="slotProps" data-slot="dialog" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </DialogRoot>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogClose.vue`
```vue
<script setup lang="ts">
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose } from 'reka-ui'

const props = defineProps<DialogCloseProps>()
</script>

<template>
  <DialogClose data-slot="dialog-close" v-bind="props">
    <slot />
  </DialogClose>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogContent.vue`
```vue
<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import DialogOverlay from './DialogOverlay.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<
    // eslint-disable-next-line vue/require-default-prop
    DialogContentProps & { class?: HTMLAttributes['class']; showCloseButton?: boolean }
  >(),
  {
    showCloseButton: true,
  },
)
const emits = defineEmits<DialogContentEmits>()
const { t } = useI18n()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          props.class,
        )
      "
    >
      <slot />

      <DialogClose
        v-if="showCloseButton"
        data-slot="dialog-close"
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <X />
        <span class="sr-only">{{ t('common.close') }}</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogDescription.vue`
```vue
<script setup lang="ts">
import type { DialogDescriptionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogDescription, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DialogDescription
    data-slot="dialog-description"
    v-bind="forwardedProps"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <slot />
  </DialogDescription>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogFooter.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { DialogClose } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

const props = withDefaults(
  defineProps<{
    // eslint-disable-next-line vue/require-default-prop
    class?: HTMLAttributes['class']
    showCloseButton?: boolean
  }>(),
  {
    showCloseButton: false,
  },
)

const { t } = useI18n()
</script>

<template>
  <div
    data-slot="dialog-footer"
    :class="cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', props.class)"
  >
    <slot />
    <DialogClose v-if="showCloseButton" as-child>
      <Button variant="outline">{{ t('common.close') }}</Button>
    </DialogClose>
  </div>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogHeader.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="dialog-header"
    :class="cn('flex flex-col gap-2 text-center sm:text-left', props.class)"
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogOverlay.vue`
```vue
<script setup lang="ts">
import type { DialogOverlayProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogOverlay } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <DialogOverlay
    data-slot="dialog-overlay"
    v-bind="delegatedProps"
    :class="
      cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
        props.class,
      )
    "
  >
    <slot />
  </DialogOverlay>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogScrollContent.vue`
```vue
<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/shared/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()
const { t } = useI18n()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    >
      <DialogContent
        :class="
          cn(
            'relative z-50 grid w-full max-w-lg my-8 gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full',
            props.class,
          )
        "
        v-bind="{ ...$attrs, ...forwarded }"
        @pointer-down-outside="
          (event) => {
            const originalEvent = event.detail.originalEvent
            const target = originalEvent.target as HTMLElement
            if (
              originalEvent.offsetX > target.clientWidth ||
              originalEvent.offsetY > target.clientHeight
            ) {
              event.preventDefault()
            }
          }
        "
      >
        <slot />

        <DialogClose
          class="absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary"
        >
          <X class="w-4 h-4" />
          <span class="sr-only">{{ t('common.close') }}</span>
        </DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogTitle.vue`
```vue
<script setup lang="ts">
import type { DialogTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogTitle, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DialogTitle
    data-slot="dialog-title"
    v-bind="forwardedProps"
    :class="cn('text-lg leading-none font-semibold', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
```

#### `apps/web/src/shared/ui/dialog/DialogTrigger.vue`
```vue
<script setup lang="ts">
import type { DialogTriggerProps } from 'reka-ui'
import { DialogTrigger } from 'reka-ui'

const props = defineProps<DialogTriggerProps>()
</script>

<template>
  <DialogTrigger data-slot="dialog-trigger" v-bind="props">
    <slot />
  </DialogTrigger>
</template>
```

#### `apps/web/src/shared/ui/dialog/index.ts`
```ts
export { default as Dialog } from './Dialog.vue'
export { default as DialogClose } from './DialogClose.vue'
export { default as DialogContent } from './DialogContent.vue'
export { default as DialogDescription } from './DialogDescription.vue'
export { default as DialogFooter } from './DialogFooter.vue'
export { default as DialogHeader } from './DialogHeader.vue'
export { default as DialogOverlay } from './DialogOverlay.vue'
export { default as DialogScrollContent } from './DialogScrollContent.vue'
export { default as DialogTitle } from './DialogTitle.vue'
export { default as DialogTrigger } from './DialogTrigger.vue'
```


## donut-chart

#### `apps/web/src/shared/ui/donut-chart/ChartLegend.vue`
```vue
<script setup lang="ts">
defineProps<{
  entries: readonly { id: string; label: string; color: string }[]
}>()
</script>

<template>
  <ul class="space-y-1.5" data-testid="chart-legend">
    <li v-for="entry in entries" :key="entry.id" class="flex items-center gap-2 text-sm">
      <span
        class="size-2.5 shrink-0 rounded-full"
        :style="{ backgroundColor: entry.color }"
        aria-hidden="true"
      />
      <span class="truncate">{{ entry.label }}</span>
    </li>
  </ul>
</template>
```

#### `apps/web/src/shared/ui/donut-chart/DonutChart.vue`
```vue
<script setup lang="ts">
import { computed } from 'vue'

/**
 * One donut segment: `id` identifies it (selection/hit-testing), `color` is
 * the fill (category color data or a token-derived neutral), `value` sizes
 * the segment's share of the ring.
 */
export interface DonutChartEntry {
  id: string
  label: string
  color: string
  value: number
}

const props = withDefaults(
  defineProps<{
    entries: readonly DonutChartEntry[]
    /** Pixel size of the square SVG canvas. */
    size?: number
    strokeWidth?: number
    /** Highlighted segment id; others dim while set. */
    selectedId?: string | null
    /** Accessible summary of the charted distribution. */
    ariaLabel?: string
  }>(),
  {
    size: 120,
    strokeWidth: 14,
    selectedId: null,
    ariaLabel: undefined,
  },
)

const emit = defineEmits<{
  select: [id: string]
}>()

interface SegmentView {
  id: string
  color: string
  dashArray: string
  dashOffset: number
}

// Angular gap between segments (2deg, shrinking for many segments) expressed
// in dash pixels; a lone segment renders as a full ring without gaps - the
// same spans the mobile Skia donut draws.
const segments = computed(() => {
  const total = props.entries.reduce((sum, entry) => sum + entry.value, 0)
  const radius = (props.size - props.strokeWidth) / 2 - 4
  const circumference = 2 * Math.PI * radius
  if (total <= 0 || props.entries.length === 0) {
    return { radius, rings: [] as SegmentView[], neutral: true }
  }
  const gapDegrees = props.entries.length > 1 ? Math.min(2, 360 / props.entries.length) : 0
  const gapPx = (gapDegrees / 360) * circumference
  let offset = 0
  const rings = props.entries.map((entry) => {
    const fraction = entry.value / total
    const dash = Math.max(fraction * circumference - gapPx, 0.1)
    const view: SegmentView = {
      id: entry.id,
      color: entry.color,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offset,
    }
    offset += fraction * circumference
    return view
  })
  return { radius, rings, neutral: false }
})
</script>

<template>
  <div class="relative inline-flex" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      :aria-label="ariaLabel"
      role="img"
      data-testid="donut-chart"
    >
      <!-- Nothing chartable (empty period / all categories excluded): a single
           neutral token-colored ring. -->
      <circle
        v-if="segments.neutral"
        :cx="size / 2"
        :cy="size / 2"
        :r="segments.radius"
        fill="none"
        class="stroke-muted-foreground"
        :stroke-width="strokeWidth"
      />
      <template v-else>
        <circle
          v-for="segment in segments.rings"
          :key="segment.id"
          :cx="size / 2"
          :cy="size / 2"
          :r="segments.radius"
          fill="none"
          :stroke="segment.color"
          :stroke-width="selectedId === segment.id ? strokeWidth + 6 : strokeWidth"
          :stroke-dasharray="segment.dashArray"
          :stroke-dashoffset="segment.dashOffset"
          :opacity="selectedId && selectedId !== segment.id ? 0.35 : 1"
          class="cursor-pointer transition-[stroke-width,opacity]"
          data-testid="donut-segment"
          :data-segment-id="segment.id"
          @click="emit('select', segment.id)"
        />
      </template>
    </svg>
    <div
      v-if="$slots.default"
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
    >
      <slot />
    </div>
  </div>
</template>
```

#### `apps/web/src/shared/ui/donut-chart/index.ts`
```ts
export { default as DonutChart, type DonutChartEntry } from './DonutChart.vue'
export { default as ChartLegend } from './ChartLegend.vue'
```


## dropdown-menu

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenu.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuRootEmits, DropdownMenuRootProps } from 'reka-ui'
import { DropdownMenuRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DropdownMenuRootProps>()
const emits = defineEmits<DropdownMenuRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DropdownMenuRoot v-slot="slotProps" data-slot="dropdown-menu" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </DropdownMenuRoot>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuCheckboxItem.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuCheckboxItemEmits, DropdownMenuCheckboxItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Check } from '@lucide/vue'
import { DropdownMenuCheckboxItem, DropdownMenuItemIndicator, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DropdownMenuCheckboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DropdownMenuCheckboxItemEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DropdownMenuCheckboxItem
    data-slot="dropdown-menu-checkbox-item"
    v-bind="forwarded"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <slot name="indicator-icon">
          <Check class="size-4" />
        </slot>
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuCheckboxItem>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuContent.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuContentEmits, DropdownMenuContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DropdownMenuContent, DropdownMenuPortal, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  // eslint-disable-next-line vue/require-default-prop
  defineProps<DropdownMenuContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    sideOffset: 4,
  },
)
const emits = defineEmits<DropdownMenuContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      data-slot="dropdown-menu-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-32 origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
          props.class,
        )
      "
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuGroup.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuGroupProps } from 'reka-ui'
import { DropdownMenuGroup } from 'reka-ui'

const props = defineProps<DropdownMenuGroupProps>()
</script>

<template>
  <DropdownMenuGroup data-slot="dropdown-menu-group" v-bind="props">
    <slot />
  </DropdownMenuGroup>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuItem.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DropdownMenuItem, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(
  defineProps<
    DropdownMenuItemProps & {
      // eslint-disable-next-line vue/require-default-prop
      class?: HTMLAttributes['class']
      inset?: boolean
      variant?: 'default' | 'destructive'
    }
  >(),
  {
    variant: 'default',
  },
)

const delegatedProps = reactiveOmit(props, 'inset', 'variant', 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuItem
    data-slot="dropdown-menu-item"
    :data-inset="inset ? '' : undefined"
    :data-variant="variant"
    v-bind="forwardedProps"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive! [&_svg:not([class*=\'text-\'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuLabel.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuLabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DropdownMenuLabel, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<
  DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }
>()

const delegatedProps = reactiveOmit(props, 'class', 'inset')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuLabel
    data-slot="dropdown-menu-label"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', props.class)"
  >
    <slot />
  </DropdownMenuLabel>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuRadioGroup.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuRadioGroupEmits, DropdownMenuRadioGroupProps } from 'reka-ui'
import { DropdownMenuRadioGroup, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DropdownMenuRadioGroupProps>()
const emits = defineEmits<DropdownMenuRadioGroupEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DropdownMenuRadioGroup data-slot="dropdown-menu-radio-group" v-bind="forwarded">
    <slot />
  </DropdownMenuRadioGroup>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuRadioItem.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuRadioItemEmits, DropdownMenuRadioItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Circle } from '@lucide/vue'
import { DropdownMenuItemIndicator, DropdownMenuRadioItem, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DropdownMenuRadioItemProps & { class?: HTMLAttributes['class'] }>()

const emits = defineEmits<DropdownMenuRadioItemEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DropdownMenuRadioItem
    data-slot="dropdown-menu-radio-item"
    v-bind="forwarded"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <slot name="indicator-icon">
          <Circle class="size-2 fill-current" />
        </slot>
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuRadioItem>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuSeparator.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuSeparatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DropdownMenuSeparator } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<
  DropdownMenuSeparatorProps & {
    class?: HTMLAttributes['class']
  }
>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <DropdownMenuSeparator
    data-slot="dropdown-menu-separator"
    v-bind="delegatedProps"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuShortcut.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    data-slot="dropdown-menu-shortcut"
    :class="cn('text-muted-foreground ml-auto text-xs tracking-widest', props.class)"
  >
    <slot />
  </span>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuSub.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuSubEmits, DropdownMenuSubProps } from 'reka-ui'
import { DropdownMenuSub, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DropdownMenuSubProps>()
const emits = defineEmits<DropdownMenuSubEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DropdownMenuSub v-slot="slotProps" data-slot="dropdown-menu-sub" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </DropdownMenuSub>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuSubContent.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuSubContentEmits, DropdownMenuSubContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DropdownMenuSubContent, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DropdownMenuSubContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DropdownMenuSubContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DropdownMenuSubContent
    data-slot="dropdown-menu-sub-content"
    v-bind="forwarded"
    :class="
      cn(
        'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuSubContent>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuSubTrigger.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuSubTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronRight } from '@lucide/vue'
import { DropdownMenuSubTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<
  DropdownMenuSubTriggerProps & { class?: HTMLAttributes['class']; inset?: boolean }
>()

const delegatedProps = reactiveOmit(props, 'class', 'inset')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuSubTrigger
    data-slot="dropdown-menu-sub-trigger"
    v-bind="forwardedProps"
    :data-inset="inset ? '' : undefined"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4 data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*=\'text-\'])]:text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
    <ChevronRight class="ml-auto size-4" />
  </DropdownMenuSubTrigger>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/DropdownMenuTrigger.vue`
```vue
<script setup lang="ts">
import type { DropdownMenuTriggerProps } from 'reka-ui'
import { DropdownMenuTrigger, useForwardProps } from 'reka-ui'

const props = defineProps<DropdownMenuTriggerProps>()

const forwardedProps = useForwardProps(props)
</script>

<template>
  <DropdownMenuTrigger data-slot="dropdown-menu-trigger" v-bind="forwardedProps">
    <slot />
  </DropdownMenuTrigger>
</template>
```

#### `apps/web/src/shared/ui/dropdown-menu/index.ts`
```ts
export { default as DropdownMenu } from './DropdownMenu.vue'

export { default as DropdownMenuCheckboxItem } from './DropdownMenuCheckboxItem.vue'
export { default as DropdownMenuContent } from './DropdownMenuContent.vue'
export { default as DropdownMenuGroup } from './DropdownMenuGroup.vue'
export { default as DropdownMenuItem } from './DropdownMenuItem.vue'
export { default as DropdownMenuLabel } from './DropdownMenuLabel.vue'
export { default as DropdownMenuRadioGroup } from './DropdownMenuRadioGroup.vue'
export { default as DropdownMenuRadioItem } from './DropdownMenuRadioItem.vue'
export { default as DropdownMenuSeparator } from './DropdownMenuSeparator.vue'
export { default as DropdownMenuShortcut } from './DropdownMenuShortcut.vue'
export { default as DropdownMenuSub } from './DropdownMenuSub.vue'
export { default as DropdownMenuSubContent } from './DropdownMenuSubContent.vue'
export { default as DropdownMenuSubTrigger } from './DropdownMenuSubTrigger.vue'
export { default as DropdownMenuTrigger } from './DropdownMenuTrigger.vue'
export { DropdownMenuPortal } from 'reka-ui'
```


## empty-state

#### `apps/web/src/shared/ui/empty-state/EmptyState.vue`
```vue
<script setup lang="ts">
import { InboxIcon } from '@lucide/vue'

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
    <slot name="icon">
      <InboxIcon class="size-8" />
    </slot>
    <p class="text-sm font-medium">{{ title }}</p>
    <p v-if="description" class="text-xs">{{ description }}</p>
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/empty-state/index.ts`
```ts
export { default as EmptyState } from './EmptyState.vue'
```


## error-state

#### `apps/web/src/shared/ui/error-state/ErrorState.vue`
```vue
<script setup lang="ts">
import { AlertCircleIcon } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { useI18n } from 'vue-i18n'

defineProps<{
  title?: string
  description?: string
}>()

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-8 text-center">
    <AlertCircleIcon class="size-8 text-muted-foreground" />
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ title ?? t('common.errorState.title') }}</p>
      <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
    </div>
    <Button variant="outline" size="sm" @click="$emit('retry')">
      {{ t('common.errorState.retry') }}
    </Button>
  </div>
</template>
```

#### `apps/web/src/shared/ui/error-state/index.ts`
```ts
export { default as ErrorState } from './ErrorState.vue'
```


## field

#### `apps/web/src/shared/ui/field/Field.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { FieldVariants } from '.'
import { fieldVariants } from '.'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  orientation?: FieldVariants['orientation']
}>()
</script>

<template>
  <div
    role="group"
    data-slot="field"
    :data-orientation="orientation"
    :class="cn(fieldVariants({ orientation }), props.class)"
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/field/FieldContent.vue`
```vue
<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="field-content"
    :class="cn('group/field-content flex flex-1 flex-col gap-1.5 leading-snug', props.class)"
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/field/FieldDescription.vue`
```vue
<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <p
    data-slot="field-description"
    :class="
      cn(
        'text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
        'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
        '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        props.class,
      )
    "
  >
    <slot />
  </p>
</template>
```

#### `apps/web/src/shared/ui/field/FieldError.vue`
```vue
<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
  errors?: Array<string | { message: string | undefined } | undefined>
}>()

const content = computed(() => {
  if (!props.errors || props.errors.length === 0) return null

  const uniqueErrors = [
    ...new Map(
      props.errors.filter(Boolean).map((error) => {
        const message = typeof error === 'string' ? error : error?.message
        return [message, error]
      }),
    ).values(),
  ]

  if (uniqueErrors.length === 1 && uniqueErrors[0]) {
    return typeof uniqueErrors[0] === 'string' ? uniqueErrors[0] : uniqueErrors[0].message
  }

  return uniqueErrors.map((error) => (typeof error === 'string' ? error : error?.message))
})
</script>

<template>
  <div
    v-if="$slots.default || content"
    role="alert"
    data-slot="field-error"
    :class="cn('text-destructive text-sm font-normal', props.class)"
  >
    <slot v-if="$slots.default" />

    <template v-else-if="typeof content === 'string'">
      {{ content }}
    </template>

    <ul v-else-if="Array.isArray(content)" class="ml-4 flex list-disc flex-col gap-1">
      <li v-for="(error, index) in content" :key="index">
        {{ error }}
      </li>
    </ul>
  </div>
</template>
```

#### `apps/web/src/shared/ui/field/FieldGroup.vue`
```vue
<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="field-group"
    :class="
      cn(
        'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/field/FieldLabel.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Label
    data-slot="field-label"
    :class="
      cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-3',
        'has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10',
        props.class,
      )
    "
  >
    <slot />
  </Label>
</template>
```

#### `apps/web/src/shared/ui/field/FieldLegend.vue`
```vue
<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
  variant?: 'legend' | 'label'
}>()
</script>

<template>
  <legend
    data-slot="field-legend"
    :data-variant="variant"
    :class="
      cn(
        'mb-3 font-medium',
        'data-[variant=legend]:text-base',
        'data-[variant=label]:text-sm',
        props.class,
      )
    "
  >
    <slot />
  </legend>
</template>
```

#### `apps/web/src/shared/ui/field/FieldSeparator.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Separator } from '@/shared/ui/separator'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="field-separator"
    :data-content="!!$slots.default"
    :class="
      cn('relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2', props.class)
    "
  >
    <Separator class="absolute inset-0 top-1/2" />
    <span
      v-if="$slots.default"
      class="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
      data-slot="field-separator-content"
    >
      <slot />
    </span>
  </div>
</template>
```

#### `apps/web/src/shared/ui/field/FieldSet.vue`
```vue
<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <fieldset
    data-slot="field-set"
    :class="
      cn(
        'flex flex-col gap-6',
        'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        props.class,
      )
    "
  >
    <slot />
  </fieldset>
</template>
```

#### `apps/web/src/shared/ui/field/FieldTitle.vue`
```vue
<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="field-label"
    :class="
      cn(
        'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/field/index.ts`
```ts
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export const fieldVariants = cva(
  'group/field flex w-full gap-1 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
        horizontal: [
          'flex-row items-center',
          '[&>[data-slot=field-label]]:flex-auto',
          'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
        responsive: [
          'flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto',
          '@md/field-group:[&>[data-slot=field-label]]:flex-auto',
          '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
)

export type FieldVariants = VariantProps<typeof fieldVariants>

export { default as Field } from './Field.vue'
export { default as FieldContent } from './FieldContent.vue'
export { default as FieldDescription } from './FieldDescription.vue'
export { default as FieldError } from './FieldError.vue'
export { default as FieldGroup } from './FieldGroup.vue'
export { default as FieldLabel } from './FieldLabel.vue'
export { default as FieldLegend } from './FieldLegend.vue'
export { default as FieldSeparator } from './FieldSeparator.vue'
export { default as FieldSet } from './FieldSet.vue'
export { default as FieldTitle } from './FieldTitle.vue'
```


## input

#### `apps/web/src/shared/ui/input/Input.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="
      cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        props.class,
      )
    "
  />
</template>
```

#### `apps/web/src/shared/ui/input/index.ts`
```ts
export { default as Input } from './Input.vue'
```


## label

#### `apps/web/src/shared/ui/label/Label.vue`
```vue
<script setup lang="ts">
import type { LabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Label } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<LabelProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <Label
    data-slot="label"
    v-bind="delegatedProps"
    :class="
      cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </Label>
</template>
```

#### `apps/web/src/shared/ui/label/index.ts`
```ts
export { default as Label } from './Label.vue'
```


## native-select

#### `apps/web/src/shared/ui/native-select/NativeSelect.vue`
```vue
<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit, useVModel } from '@vueuse/core'
import { ChevronDownIcon } from '@lucide/vue'
import { cn } from '@/shared/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  modelValue?: AcceptableValue | AcceptableValue[]
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AcceptableValue]
}>()

const modelValue = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: '',
})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <div
    class="group/native-select relative w-fit has-[select:disabled]:opacity-50"
    data-slot="native-select-wrapper"
  >
    <select
      v-bind="{ ...$attrs, ...delegatedProps }"
      v-model="modelValue"
      data-slot="native-select"
      :class="
        cn(
          'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 h-9 w-full min-w-0 appearance-none rounded-md border bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          props.class,
        )
      "
    >
      <slot />
    </select>
    <ChevronDownIcon
      class="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 opacity-50 select-none"
      aria-hidden="true"
      data-slot="native-select-icon"
    />
  </div>
</template>
```

#### `apps/web/src/shared/ui/native-select/NativeSelectOptGroup.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <optgroup
    data-slot="native-select-optgroup"
    :class="cn('bg-popover text-popover-foreground', props.class)"
  >
    <slot />
  </optgroup>
</template>
```

#### `apps/web/src/shared/ui/native-select/NativeSelectOption.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <option
    data-slot="native-select-option"
    :class="cn('bg-popover text-popover-foreground', props.class)"
  >
    <slot />
  </option>
</template>
```

#### `apps/web/src/shared/ui/native-select/index.ts`
```ts
export { default as NativeSelect } from './NativeSelect.vue'
export { default as NativeSelectOptGroup } from './NativeSelectOptGroup.vue'
export { default as NativeSelectOption } from './NativeSelectOption.vue'
```


## number-field

#### `apps/web/src/shared/ui/number-field/NumberField.vue`
```vue
<script setup lang="ts">
import type { NumberFieldRootEmits, NumberFieldRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { NumberFieldRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<NumberFieldRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<NumberFieldRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <NumberFieldRoot v-slot="slotProps" v-bind="forwarded" :class="cn('grid gap-1.5', props.class)">
    <slot v-bind="slotProps" />
  </NumberFieldRoot>
</template>
```

#### `apps/web/src/shared/ui/number-field/NumberFieldContent.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="
      cn(
        'relative [&>[data-slot=input]]:has-[[data-slot=increment]]:pr-5 [&>[data-slot=input]]:has-[[data-slot=decrement]]:pl-5',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/number-field/NumberFieldDecrement.vue`
```vue
<script setup lang="ts">
import type { NumberFieldDecrementProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Minus } from '@lucide/vue'
import { NumberFieldDecrement, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<NumberFieldDecrementProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <NumberFieldDecrement
    data-slot="decrement"
    v-bind="forwarded"
    :class="
      cn(
        'absolute top-1/2 -translate-y-1/2 left-0 p-3 disabled:cursor-not-allowed disabled:opacity-20',
        props.class,
      )
    "
  >
    <slot>
      <Minus class="h-4 w-4" />
    </slot>
  </NumberFieldDecrement>
</template>
```

#### `apps/web/src/shared/ui/number-field/NumberFieldIncrement.vue`
```vue
<script setup lang="ts">
import type { NumberFieldIncrementProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Plus } from '@lucide/vue'
import { NumberFieldIncrement, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<NumberFieldIncrementProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <NumberFieldIncrement
    data-slot="increment"
    v-bind="forwarded"
    :class="
      cn(
        'absolute top-1/2 -translate-y-1/2 right-0 disabled:cursor-not-allowed disabled:opacity-20 p-3',
        props.class,
      )
    "
  >
    <slot>
      <Plus class="h-4 w-4" />
    </slot>
  </NumberFieldIncrement>
</template>
```

#### `apps/web/src/shared/ui/number-field/NumberFieldInput.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { NumberFieldInput } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <NumberFieldInput
    data-slot="input"
    :class="
      cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent py-1 text-sm text-center shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        props.class,
      )
    "
  />
</template>
```

#### `apps/web/src/shared/ui/number-field/index.ts`
```ts
export { default as NumberField } from './NumberField.vue'
export { default as NumberFieldContent } from './NumberFieldContent.vue'
export { default as NumberFieldDecrement } from './NumberFieldDecrement.vue'
export { default as NumberFieldIncrement } from './NumberFieldIncrement.vue'
export { default as NumberFieldInput } from './NumberFieldInput.vue'
```


## popover

#### `apps/web/src/shared/ui/popover/Popover.vue`
```vue
<script setup lang="ts">
import type { PopoverRootEmits, PopoverRootProps } from 'reka-ui'
import { PopoverRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<PopoverRootProps>()
const emits = defineEmits<PopoverRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <PopoverRoot v-slot="slotProps" data-slot="popover" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </PopoverRoot>
</template>
```

#### `apps/web/src/shared/ui/popover/PopoverAnchor.vue`
```vue
<script setup lang="ts">
import type { PopoverAnchorProps } from 'reka-ui'
import { PopoverAnchor } from 'reka-ui'

const props = defineProps<PopoverAnchorProps>()
</script>

<template>
  <PopoverAnchor data-slot="popover-anchor" v-bind="props">
    <slot />
  </PopoverAnchor>
</template>
```

#### `apps/web/src/shared/ui/popover/PopoverContent.vue`
```vue
<script setup lang="ts">
import type { PopoverContentEmits, PopoverContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { PopoverContent, PopoverPortal, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  // eslint-disable-next-line vue/require-default-prop
  defineProps<PopoverContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    align: 'center',
    sideOffset: 4,
  },
)
const emits = defineEmits<PopoverContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      data-slot="popover-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md origin-(--reka-popover-content-transform-origin) outline-hidden max-w-(--reka-popover-content-available-width)',
          props.class,
        )
      "
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
```

#### `apps/web/src/shared/ui/popover/PopoverTrigger.vue`
```vue
<script setup lang="ts">
import type { PopoverTriggerProps } from 'reka-ui'
import { PopoverTrigger } from 'reka-ui'

const props = defineProps<PopoverTriggerProps>()
</script>

<template>
  <PopoverTrigger data-slot="popover-trigger" v-bind="props">
    <slot />
  </PopoverTrigger>
</template>
```

#### `apps/web/src/shared/ui/popover/index.ts`
```ts
export { default as Popover } from './Popover.vue'
export { default as PopoverAnchor } from './PopoverAnchor.vue'
export { default as PopoverContent } from './PopoverContent.vue'
export { default as PopoverTrigger } from './PopoverTrigger.vue'
```


## range-calendar

#### `apps/web/src/shared/ui/range-calendar/RangeCalendar.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarRootEmits, RangeCalendarRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import {
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarNextButton,
  RangeCalendarPrevButton,
} from '.'

const props = defineProps<RangeCalendarRootProps & { class?: HTMLAttributes['class'] }>()

const emits = defineEmits<RangeCalendarRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <RangeCalendarRoot
    v-slot="{ grid, weekDays }"
    data-slot="range-calendar"
    :class="cn('p-3', props.class)"
    v-bind="forwarded"
  >
    <RangeCalendarHeader>
      <RangeCalendarHeading />

      <div class="flex items-center gap-1">
        <RangeCalendarPrevButton />
        <RangeCalendarNextButton />
      </div>
    </RangeCalendarHeader>

    <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
      <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()">
        <RangeCalendarGridHead>
          <RangeCalendarGridRow>
            <RangeCalendarHeadCell v-for="day in weekDays" :key="day">
              {{ day }}
            </RangeCalendarHeadCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridHead>
        <RangeCalendarGridBody>
          <RangeCalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="mt-2 w-full"
          >
            <RangeCalendarCell
              v-for="weekDate in weekDates"
              :key="weekDate.toString()"
              :date="weekDate"
            >
              <RangeCalendarCellTrigger :day="weekDate" :month="month.value" />
            </RangeCalendarCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridBody>
      </RangeCalendarGrid>
    </div>
  </RangeCalendarRoot>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarCell.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarCellProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarCell, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RangeCalendarCellProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarCell
    data-slot="range-calendar-cell"
    :class="
      cn(
        'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md [&:has([data-selected][data-selection-end])]:rounded-r-md [&:has([data-selected][data-selection-start])]:rounded-l-md',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarCell>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarCellTrigger.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarCellTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarCellTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = withDefaults(
  // eslint-disable-next-line vue/require-default-prop
  defineProps<RangeCalendarCellTriggerProps & { class?: HTMLAttributes['class'] }>(),
  {
    as: 'button',
  },
)

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarCellTrigger
    data-slot="range-calendar-trigger"
    :class="
      cn(
        buttonVariants({ variant: 'ghost' }),
        'h-8 w-8 p-0 font-normal data-selected:opacity-100',
        '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
        // Selection Start
        'data-selection-start:bg-primary data-selection-start:text-primary-foreground [&[data-selection-start]:hover]:bg-primary data-selection-start:hover:text-primary-foreground data-selection-start:focus:bg-primary data-selection-start:focus:text-primary-foreground',
        // Selection End
        'data-selection-end:bg-primary data-selection-end:text-primary-foreground [&[data-selection-end]:hover]:bg-primary data-selection-end:hover:text-primary-foreground data-selection-end:focus:bg-primary data-selection-end:focus:text-primary-foreground',
        // Outside months
        'data-outside-view:text-muted-foreground',
        // Disabled
        'data-disabled:text-muted-foreground data-disabled:opacity-50',
        // Unavailable
        'data-unavailable:text-destructive-foreground data-unavailable:line-through',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarCellTrigger>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarGrid.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarGridProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarGrid, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RangeCalendarGridProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarGrid
    data-slot="range-calendar-grid"
    :class="cn('w-full border-collapse space-x-1', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarGrid>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarGridBody.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarGridBodyProps } from 'reka-ui'
import { RangeCalendarGridBody } from 'reka-ui'

const props = defineProps<RangeCalendarGridBodyProps>()
</script>

<template>
  <RangeCalendarGridBody data-slot="range-calendar-grid-body" v-bind="props">
    <slot />
  </RangeCalendarGridBody>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarGridHead.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarGridHeadProps } from 'reka-ui'
import { RangeCalendarGridHead } from 'reka-ui'

const props = defineProps<RangeCalendarGridHeadProps>()
</script>

<template>
  <RangeCalendarGridHead data-slot="range-calendar-grid-head" v-bind="props">
    <slot />
  </RangeCalendarGridHead>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarGridRow.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarGridRowProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarGridRow, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RangeCalendarGridRowProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarGridRow
    data-slot="range-calendar-grid-row"
    :class="cn('flex', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarGridRow>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarHeadCell.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarHeadCellProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarHeadCell, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RangeCalendarHeadCellProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarHeadCell
    data-slot="range-calendar-head-cell"
    :class="cn('w-8 rounded-md text-[0.8rem] font-normal text-muted-foreground', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarHeadCell>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarHeader.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarHeaderProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarHeader, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RangeCalendarHeaderProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarHeader
    data-slot="range-calendar-header"
    :class="cn('flex justify-center pt-1 relative items-center w-full', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarHeader>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarHeading.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarHeadingProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { RangeCalendarHeading, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RangeCalendarHeadingProps & { class?: HTMLAttributes['class'] }>()

defineSlots<{
  default: (props: { headingValue: string }) => unknown
}>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarHeading
    v-slot="{ headingValue }"
    data-slot="range-calendar-heading"
    :class="cn('text-sm font-medium', props.class)"
    v-bind="forwardedProps"
  >
    <slot :heading-value>
      {{ headingValue }}
    </slot>
  </RangeCalendarHeading>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarNextButton.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarNextProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronRight } from '@lucide/vue'
import { RangeCalendarNext, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = defineProps<RangeCalendarNextProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarNext
    data-slot="range-calendar-next-button"
    :class="
      cn(
        buttonVariants({ variant: 'outline' }),
        'absolute right-1',
        'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot>
      <ChevronRight class="size-4" />
    </slot>
  </RangeCalendarNext>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/RangeCalendarPrevButton.vue`
```vue
<script lang="ts" setup>
import type { RangeCalendarPrevProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronLeft } from '@lucide/vue'
import { RangeCalendarPrev, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'

const props = defineProps<RangeCalendarPrevProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarPrev
    data-slot="range-calendar-prev-button"
    :class="
      cn(
        buttonVariants({ variant: 'outline' }),
        'absolute left-1',
        'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot>
      <ChevronLeft class="size-4" />
    </slot>
  </RangeCalendarPrev>
</template>
```

#### `apps/web/src/shared/ui/range-calendar/index.ts`
```ts
export { default as RangeCalendar } from './RangeCalendar.vue'
export { default as RangeCalendarCell } from './RangeCalendarCell.vue'
export { default as RangeCalendarCellTrigger } from './RangeCalendarCellTrigger.vue'
export { default as RangeCalendarGrid } from './RangeCalendarGrid.vue'
export { default as RangeCalendarGridBody } from './RangeCalendarGridBody.vue'
export { default as RangeCalendarGridHead } from './RangeCalendarGridHead.vue'
export { default as RangeCalendarGridRow } from './RangeCalendarGridRow.vue'
export { default as RangeCalendarHeadCell } from './RangeCalendarHeadCell.vue'
export { default as RangeCalendarHeader } from './RangeCalendarHeader.vue'
export { default as RangeCalendarHeading } from './RangeCalendarHeading.vue'
export { default as RangeCalendarNextButton } from './RangeCalendarNextButton.vue'
export { default as RangeCalendarPrevButton } from './RangeCalendarPrevButton.vue'
```


## select

#### `apps/web/src/shared/ui/select/Select.vue`
```vue
<script setup lang="ts">
import type { SelectRootEmits, SelectRootProps } from 'reka-ui'
import { SelectRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<SelectRootProps>()
const emits = defineEmits<SelectRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <SelectRoot v-slot="slotProps" data-slot="select" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </SelectRoot>
</template>
```

#### `apps/web/src/shared/ui/select/SelectContent.vue`
```vue
<script setup lang="ts">
import type { SelectContentEmits, SelectContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectContent, SelectPortal, SelectViewport, useForwardPropsEmits } from 'reka-ui'
import { SelectScrollDownButton, SelectScrollUpButton } from '.'
import { cn } from '@/shared/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  // eslint-disable-next-line vue/require-default-prop
  defineProps<SelectContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    position: 'popper',
  },
)
const emits = defineEmits<SelectContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SelectPortal>
    <SelectContent
      data-slot="select-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-32 overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          props.class,
        )
      "
    >
      <SelectScrollUpButton />
      <SelectViewport
        :class="
          cn(
            'p-1',
            position === 'popper' &&
              'h-(--reka-select-trigger-height) w-full min-w-(--reka-select-trigger-width) scroll-my-1',
          )
        "
      >
        <slot />
      </SelectViewport>
      <SelectScrollDownButton />
    </SelectContent>
  </SelectPortal>
</template>
```

#### `apps/web/src/shared/ui/select/SelectGroup.vue`
```vue
<script setup lang="ts">
import type { SelectGroupProps } from 'reka-ui'
import { SelectGroup } from 'reka-ui'

const props = defineProps<SelectGroupProps>()
</script>

<template>
  <SelectGroup data-slot="select-group" v-bind="props">
    <slot />
  </SelectGroup>
</template>
```

#### `apps/web/src/shared/ui/select/SelectItem.vue`
```vue
<script setup lang="ts">
import type { SelectItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Check } from '@lucide/vue'
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectItem
    data-slot="select-item"
    v-bind="forwardedProps"
    :class="
      cn(
        'focus:bg-accent focus:text-accent-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2',
        props.class,
      )
    "
  >
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectItemIndicator>
        <slot name="indicator-icon">
          <Check class="size-4" />
        </slot>
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
```

#### `apps/web/src/shared/ui/select/SelectItemText.vue`
```vue
<script setup lang="ts">
import type { SelectItemTextProps } from 'reka-ui'
import { SelectItemText } from 'reka-ui'

const props = defineProps<SelectItemTextProps>()
</script>

<template>
  <SelectItemText data-slot="select-item-text" v-bind="props">
    <slot />
  </SelectItemText>
</template>
```

#### `apps/web/src/shared/ui/select/SelectLabel.vue`
```vue
<script setup lang="ts">
import type { SelectLabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SelectLabel } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <SelectLabel
    data-slot="select-label"
    :class="cn('text-muted-foreground px-2 py-1.5 text-xs', props.class)"
  >
    <slot />
  </SelectLabel>
</template>
```

#### `apps/web/src/shared/ui/select/SelectScrollDownButton.vue`
```vue
<script setup lang="ts">
import type { SelectScrollDownButtonProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronDown } from '@lucide/vue'
import { SelectScrollDownButton, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectScrollDownButtonProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectScrollDownButton
    data-slot="select-scroll-down-button"
    v-bind="forwardedProps"
    :class="cn('flex cursor-default items-center justify-center py-1', props.class)"
  >
    <slot>
      <ChevronDown class="size-4" />
    </slot>
  </SelectScrollDownButton>
</template>
```

#### `apps/web/src/shared/ui/select/SelectScrollUpButton.vue`
```vue
<script setup lang="ts">
import type { SelectScrollUpButtonProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronUp } from '@lucide/vue'
import { SelectScrollUpButton, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectScrollUpButtonProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectScrollUpButton
    data-slot="select-scroll-up-button"
    v-bind="forwardedProps"
    :class="cn('flex cursor-default items-center justify-center py-1', props.class)"
  >
    <slot>
      <ChevronUp class="size-4" />
    </slot>
  </SelectScrollUpButton>
</template>
```

#### `apps/web/src/shared/ui/select/SelectSeparator.vue`
```vue
<script setup lang="ts">
import type { SelectSeparatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectSeparator } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <SelectSeparator
    data-slot="select-separator"
    v-bind="delegatedProps"
    :class="cn('bg-border pointer-events-none -mx-1 my-1 h-px', props.class)"
  />
</template>
```

#### `apps/web/src/shared/ui/select/SelectTrigger.vue`
```vue
<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronDown } from '@lucide/vue'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(
  // eslint-disable-next-line vue/require-default-prop
  defineProps<SelectTriggerProps & { class?: HTMLAttributes['class']; size?: 'sm' | 'default' }>(),
  { size: 'default' },
)

const delegatedProps = reactiveOmit(props, 'class', 'size')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="
      cn(
        'border-input data-placeholder:text-muted-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
```

#### `apps/web/src/shared/ui/select/SelectValue.vue`
```vue
<script setup lang="ts">
import type { SelectValueProps } from 'reka-ui'
import { SelectValue } from 'reka-ui'

const props = defineProps<SelectValueProps>()
</script>

<template>
  <SelectValue data-slot="select-value" v-bind="props">
    <slot />
  </SelectValue>
</template>
```

#### `apps/web/src/shared/ui/select/index.ts`
```ts
export { default as Select } from './Select.vue'
export { default as SelectContent } from './SelectContent.vue'
export { default as SelectGroup } from './SelectGroup.vue'
export { default as SelectItem } from './SelectItem.vue'
export { default as SelectItemText } from './SelectItemText.vue'
export { default as SelectLabel } from './SelectLabel.vue'
export { default as SelectScrollDownButton } from './SelectScrollDownButton.vue'
export { default as SelectScrollUpButton } from './SelectScrollUpButton.vue'
export { default as SelectSeparator } from './SelectSeparator.vue'
export { default as SelectTrigger } from './SelectTrigger.vue'
export { default as SelectValue } from './SelectValue.vue'
```


## separator

#### `apps/web/src/shared/ui/separator/Separator.vue`
```vue
<script setup lang="ts">
import type { SeparatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Separator } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(
  defineProps<
    // eslint-disable-next-line vue/require-default-prop
    SeparatorProps & { class?: HTMLAttributes['class'] }
  >(),
  {
    orientation: 'horizontal',
    decorative: true,
  },
)

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <Separator
    data-slot="separator"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        props.class,
      )
    "
  />
</template>
```

#### `apps/web/src/shared/ui/separator/index.ts`
```ts
export { default as Separator } from './Separator.vue'
```


## sheet

#### `apps/web/src/shared/ui/sheet/Sheet.vue`
```vue
<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import { DialogRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DialogRootProps>()
const emits = defineEmits<DialogRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DialogRoot v-slot="slotProps" data-slot="sheet" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </DialogRoot>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetClose.vue`
```vue
<script setup lang="ts">
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose } from 'reka-ui'

const props = defineProps<DialogCloseProps>()
</script>

<template>
  <DialogClose data-slot="sheet-close" v-bind="props">
    <slot />
  </DialogClose>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetContent.vue`
```vue
<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'
import SheetOverlay from './SheetOverlay.vue'

interface SheetContentProps extends DialogContentProps {
  // eslint-disable-next-line vue/require-default-prop
  class?: HTMLAttributes['class']
  side?: 'top' | 'right' | 'bottom' | 'left'
}

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SheetContentProps>(), {
  side: 'right',
})
const emits = defineEmits<DialogContentEmits>()
const { t } = useI18n()

const delegatedProps = reactiveOmit(props, 'class', 'side')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      data-slot="sheet-content"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          props.class,
        )
      "
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <slot />

      <DialogClose
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <X class="size-4" />
        <span class="sr-only">{{ t('common.close') }}</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetDescription.vue`
```vue
<script setup lang="ts">
import type { DialogDescriptionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogDescription } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <DialogDescription
    data-slot="sheet-description"
    :class="cn('text-muted-foreground text-sm', props.class)"
    v-bind="delegatedProps"
  >
    <slot />
  </DialogDescription>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetFooter.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="sheet-footer" :class="cn('mt-auto flex flex-col gap-2 p-4', props.class)">
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetHeader.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="sheet-header" :class="cn('flex flex-col gap-1.5 p-4', props.class)">
    <slot />
  </div>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetOverlay.vue`
```vue
<script setup lang="ts">
import type { DialogOverlayProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogOverlay } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <DialogOverlay
    data-slot="sheet-overlay"
    :class="
      cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
        props.class,
      )
    "
    v-bind="delegatedProps"
  >
    <slot />
  </DialogOverlay>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetTitle.vue`
```vue
<script setup lang="ts">
import type { DialogTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogTitle } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <DialogTitle
    data-slot="sheet-title"
    :class="cn('text-foreground font-semibold', props.class)"
    v-bind="delegatedProps"
  >
    <slot />
  </DialogTitle>
</template>
```

#### `apps/web/src/shared/ui/sheet/SheetTrigger.vue`
```vue
<script setup lang="ts">
import type { DialogTriggerProps } from 'reka-ui'
import { DialogTrigger } from 'reka-ui'

const props = defineProps<DialogTriggerProps>()
</script>

<template>
  <DialogTrigger data-slot="sheet-trigger" v-bind="props">
    <slot />
  </DialogTrigger>
</template>
```

#### `apps/web/src/shared/ui/sheet/index.ts`
```ts
export { default as Sheet } from './Sheet.vue'
export { default as SheetClose } from './SheetClose.vue'
export { default as SheetContent } from './SheetContent.vue'
export { default as SheetDescription } from './SheetDescription.vue'
export { default as SheetFooter } from './SheetFooter.vue'
export { default as SheetHeader } from './SheetHeader.vue'
export { default as SheetTitle } from './SheetTitle.vue'
export { default as SheetTrigger } from './SheetTrigger.vue'
```


## skeleton

#### `apps/web/src/shared/ui/skeleton/Skeleton.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-muted', props.class)" />
</template>
```

#### `apps/web/src/shared/ui/skeleton/index.ts`
```ts
export { default as Skeleton } from './Skeleton.vue'
```


## sonner

#### `apps/web/src/shared/ui/sonner/Sonner.vue`
```vue
<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue'
import { Toaster as Sonner } from 'vue-sonner'
import { cn } from '@/shared/lib/utils'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
    v-bind="props"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>
```

#### `apps/web/src/shared/ui/sonner/index.ts`
```ts
export { default as Toaster } from './Sonner.vue'
```


## spinner

#### `apps/web/src/shared/ui/spinner/Spinner.vue`
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Loader2Icon } from '@lucide/vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Loader2Icon role="status" :class="cn('size-4 animate-spin', props.class)" />
</template>
```

#### `apps/web/src/shared/ui/spinner/index.ts`
```ts
export { default as Spinner } from "./Spinner.vue"
```


## tabs

#### `apps/web/src/shared/ui/tabs/Tabs.vue`
```vue
<script setup lang="ts">
import type { TabsRootEmits, TabsRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<TabsRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TabsRoot
    v-slot="slotProps"
    data-slot="tabs"
    v-bind="forwarded"
    :class="cn('flex flex-col gap-2', props.class)"
  >
    <slot v-bind="slotProps" />
  </TabsRoot>
</template>
```

#### `apps/web/src/shared/ui/tabs/TabsContent.vue`
```vue
<script setup lang="ts">
import type { TabsContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsContent } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <TabsContent
    data-slot="tabs-content"
    :class="cn('flex-1 outline-none', props.class)"
    v-bind="delegatedProps"
  >
    <slot />
  </TabsContent>
</template>
```

#### `apps/web/src/shared/ui/tabs/TabsList.vue`
```vue
<script setup lang="ts">
import type { TabsListProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsList } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        props.class,
      )
    "
  >
    <slot />
  </TabsList>
</template>
```

#### `apps/web/src/shared/ui/tabs/TabsTrigger.vue`
```vue
<script setup lang="ts">
import type { TabsTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :class="
      cn(
        'data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot />
  </TabsTrigger>
</template>
```

#### `apps/web/src/shared/ui/tabs/index.ts`
```ts
export { default as Tabs } from './Tabs.vue'
export { default as TabsContent } from './TabsContent.vue'
export { default as TabsList } from './TabsList.vue'
export { default as TabsTrigger } from './TabsTrigger.vue'
```

### `apps/web/src/shared/lib/utils.ts`
```ts
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
