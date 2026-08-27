<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLocalDbBootState } from '@/shared/lib/local-db'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

// Boot state machine of the local database (design D2): splash while the
// worker opens OPFS/SQLite (tens of ms), the single-tab banner when another
// tab holds the Web Lock (design D3), and the app itself only once ready.
const { t } = useI18n()
const bootState = useLocalDbBootState()

function reload() {
  window.location.reload()
}
</script>

<template>
  <slot v-if="bootState === 'ready'" />

  <div
    v-else-if="bootState === 'booting'"
    class="flex min-h-screen items-center justify-center"
    data-testid="local-db-booting"
  >
    <div class="flex items-center gap-3 text-muted-foreground">
      <Spinner class="size-5" />
      <span class="text-sm">{{ t('boot.loading') }}</span>
    </div>
  </div>

  <div
    v-else
    class="flex min-h-screen items-center justify-center p-6"
    data-testid="local-db-busy"
  >
    <div class="max-w-md space-y-4 text-center">
      <h1 class="text-lg font-semibold">{{ t('boot.busyTitle') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('boot.busyDescription') }}</p>
      <Button @click="reload">{{ t('boot.reload') }}</Button>
    </div>
  </div>
</template>
