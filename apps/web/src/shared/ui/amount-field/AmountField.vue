<script setup lang="ts">
import { computed, nextTick, ref, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'
import { Field, FieldError } from '@/shared/ui/field'
import { cn } from '@/shared/lib/utils'
import { currencySymbol, formatMoney, DEFAULT_CURRENCY, toMinorUnits, type CurrencyCode } from '@/shared/lib/money'
import {
  defaultAmountPlaceholder,
  formatEditableAmount,
  normalizePastedAmount,
  parseAmountDraft,
  sanitizeTypedAmountDraft,
  type AmountFieldMode,
} from './amount-draft'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    id?: string
    currency?: CurrencyCode
    errors?: string[]
    placeholder?: string
    class?: string
    hero?: boolean
    mode?: AmountFieldMode
  }>(),
  {
    id: 'amount',
    currency: DEFAULT_CURRENCY,
    errors: undefined,
    placeholder: undefined,
    class: undefined,
    hero: false,
    mode: 'positive',
  },
)

const modelValue = defineModel<number | undefined>()
const attrs = useAttrs()
const { locale } = useI18n()

const focused = ref(false)
const pointerFocus = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const defaultPlaceholder = computed(() => defaultAmountPlaceholder(locale.value))
const placeholder = computed(() => props.placeholder ?? defaultPlaceholder.value)
const suffix = computed(() => currencySymbol(props.currency))
const blurredValue = computed(() =>
  modelValue.value === undefined
    ? ''
    : formatMoney(toMinorUnits(modelValue.value), props.currency, locale.value),
)
const inputValue = computed(() => (focused.value ? draft.value : blurredValue.value))
const showSuffix = computed(() => focused.value || inputValue.value.length === 0)

function syncDraftFromModel(): void {
  draft.value =
    modelValue.value === undefined ? '' : formatEditableAmount(modelValue.value, locale.value)
}

function handlePointerDown(): void {
  pointerFocus.value = true
}

function handleFocus(): void {
  focused.value = true
  syncDraftFromModel()

  nextTick(() => {
    const element = inputRef.value
    if (!element) return

    if (!pointerFocus.value || draft.value === '0') {
      element.select()
    }

    pointerFocus.value = false
  })
}

function handleBlur(): void {
  pointerFocus.value = false
  focused.value = false

  const parsed = parseAmountDraft(draft.value)
  if (parsed.kind === 'valid') {
    modelValue.value = parsed.value
    draft.value = formatEditableAmount(parsed.value!, locale.value)
    return
  }

  if (parsed.kind === 'empty') {
    modelValue.value = undefined
    draft.value = ''
    return
  }

  syncDraftFromModel()
}

function handleInput(event: Event): void {
  const element = event.target as HTMLInputElement
  const selectionStart = element.selectionStart ?? element.value.length
  const sanitized = sanitizeTypedAmountDraft(element.value, selectionStart, props.mode)

  if (sanitized.draft !== draft.value) {
    draft.value = sanitized.draft
  }

  const parsed = parseAmountDraft(sanitized.draft)
  if (parsed.kind === 'valid') {
    modelValue.value = parsed.value
  } else if (parsed.kind === 'empty') {
    modelValue.value = undefined
  }

  if (sanitized.draft === element.value) {
    return
  }

  nextTick(() => {
    element.setSelectionRange(sanitized.selectionStart, sanitized.selectionStart)
  })
}

function handlePaste(event: ClipboardEvent): void {
  const pastedText = event.clipboardData?.getData('text')
  if (pastedText === undefined) {
    return
  }

  const normalized = normalizePastedAmount(pastedText, props.mode)
  if (normalized === null) {
    event.preventDefault()
    return
  }

  event.preventDefault()

  const element = event.target as HTMLInputElement
  const selectionStart = element.selectionStart ?? draft.value.length
  const selectionEnd = element.selectionEnd ?? selectionStart
  const nextRawDraft = `${draft.value.slice(0, selectionStart)}${normalized}${draft.value.slice(selectionEnd)}`
  const sanitized = sanitizeTypedAmountDraft(
    nextRawDraft,
    selectionStart + normalized.length,
    props.mode,
  )

  draft.value = sanitized.draft

  const parsed = parseAmountDraft(sanitized.draft)
  if (parsed.kind === 'valid') {
    modelValue.value = parsed.value
  } else if (parsed.kind === 'empty') {
    modelValue.value = undefined
  }

  nextTick(() => {
    element.setSelectionRange(sanitized.selectionStart, sanitized.selectionStart)
  })
}
</script>

<template>
  <Field :class="props.class" :data-invalid="!!props.errors?.length">
    <div class="relative">
      <input
        :id="props.id"
        ref="inputRef"
        v-bind="attrs"
        :value="inputValue"
        type="text"
        inputmode="decimal"
        data-slot="amount-input"
        :placeholder="placeholder"
        :aria-invalid="!!props.errors?.length"
        :class="
          cn(
            props.hero
              ? 'h-14 rounded-none border-0 border-b bg-transparent px-0 pr-10 text-left text-3xl font-bold tabular-nums focus-visible:border-ring focus-visible:ring-0 md:text-3xl'
              : 'h-10 rounded-input border border-input bg-transparent px-3 pr-10 py-2.5 text-left text-base tabular-nums md:text-sm',
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 w-full min-w-0 transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:border-ring focus-visible:ring-primary/10 focus-visible:ring-2',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          )
        "
        @pointerdown="handlePointerDown"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @paste="handlePaste"
      />
      <span
        v-if="showSuffix"
        class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium text-muted-foreground"
        :class="props.hero ? 'right-0 text-base' : undefined"
      >
        {{ suffix }}
      </span>
    </div>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
