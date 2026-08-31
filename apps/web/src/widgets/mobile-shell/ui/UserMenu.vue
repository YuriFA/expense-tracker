<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LogOut } from '@lucide/vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { useAuthStore } from '@/entities/session'
import { notification } from '@/shared/services/notification'

// Account access in the mobile top bar (web-screens: mobile top bar account
// access) - the replacement for the drawer's auth footer.
const { t } = useI18n()
const auth = useAuthStore()

const initial = computed(() => auth.user?.email?.charAt(0).toUpperCase() ?? '?')

async function signOut() {
  await auth.logout()
  notification.success(t('auth.signedOut'))
  // Same contract as the sidebar footer: logout keeps local data and the
  // anonymous mode usable, so stay right here.
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground"
        :aria-label="t('shell.openAccountMenu')"
        data-testid="user-menu-trigger"
      >
        {{ initial }}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel class="max-w-52 truncate font-normal text-muted-foreground">
        {{ auth.user?.email }}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem data-testid="user-menu-sign-out" @click="signOut">
        <LogOut class="size-4" aria-hidden="true" />
        {{ t('auth.signOut') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
