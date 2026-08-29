<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { CloudOffIcon, Menu } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'
import { SyncStatusBadge } from '@/widgets/sync-status'
import { useAuthStore } from '@/entities/session'
import AppSidebarNav from './AppSidebarNav.vue'

const { t } = useI18n()
const auth = useAuthStore()

const menuOpen = ref(false)
</script>

<template>
  <header
    class="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur lg:hidden"
  >
    <Sheet v-model:open="menuOpen">
      <SheetTrigger as-child>
        <Button variant="ghost" size="icon" :aria-label="t('nav.openMenu')">
          <Menu class="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" class="w-72 gap-0 p-0">
        <SheetTitle class="sr-only">{{ t('app.name') }}</SheetTitle>
        <AppSidebarNav :footer="false" @navigate="menuOpen = false" />
      </SheetContent>
    </Sheet>

    <span class="text-sm font-semibold">{{ t('app.name') }}</span>

    <!-- Compact paper-redesign cluster: both controls drop their long
         labels - a 390px bar cannot fit the full pill + badge pair. The
         state text survives as title/aria, the drawer nav carries the
         identity entry. -->
    <div class="ml-auto flex items-center gap-1.5">
      <SyncStatusBadge compact />
      <!-- Anonymous (local) mode indicator: everything works on local data;
           sign-in only adds server sync. -->
      <span
        v-if="!auth.isAuthenticated"
        class="inline-flex h-7 items-center gap-1 rounded-full bg-accent pr-2.5 pl-2 text-[11px] font-semibold text-accent-foreground"
        data-testid="guest-mode-indicator"
      >
        <CloudOffIcon class="size-3" aria-hidden="true" />
        {{ t('auth.guestModeShort') }}
      </span>
    </div>
  </header>
</template>
