<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { Menu } from '@lucide/vue'
import { Badge } from '@/shared/ui/badge'
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

    <div class="ml-auto flex items-center gap-2">
      <SyncStatusBadge />
      <!-- Anonymous (local) mode indicator: everything works on local data;
           sign-in only adds server sync. -->
      <Badge
        v-if="!auth.isAuthenticated"
        variant="secondary"
        data-testid="guest-mode-indicator"
      >
        {{ t('auth.guestMode') }}
      </Badge>
    </div>
  </header>
</template>
