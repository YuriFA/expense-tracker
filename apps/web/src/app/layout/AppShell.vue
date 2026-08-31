<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import AppSidebar from './AppSidebar.vue'
import BootGate from './BootGate.vue'
import { BottomNavLayout, BottomTabBar, MobileTopBar, SpeedDialFab } from '@/widgets/mobile-shell'
import { OwnershipGateDialog, useAuthStore } from '@/entities/session'
import { ConflictCenter } from '@/features/sync-conflicts'
import { HouseholdChoiceDialog, useHouseholdJoinStore } from '@/features/household-join'
import { provideSyncController } from '@/shared/lib/local-db'

const route = useRoute()
// Auth entry points (login/register/verify/reset) render full-screen without
// the app navigation.
const showNav = computed(() => !route.meta.public)

// JS-gated (not CSS-hidden) so exactly one instance of the sync/guest badges
// exists in the DOM per viewport - e2e locators match by testid strictly.
// 768px is the sidebar <-> bottom-tabs boundary (web-screens: below it the
// mobile shell replaces the sidebar).
const isDesktop = useMediaQuery('(min-width: 768px)')

// The sync controller is composed here (the FSD composition root): it needs
// the auth state (entities) and provides itself down to the badge/conflict
// center (widgets/features) via shared/lib/sync. The household gate rides the
// same injection - shared/lib must not import entities/features, so AppShell
// closes over the join store (household-join design D7).
const auth = useAuthStore()
const householdJoin = useHouseholdJoinStore()
provideSyncController({
  isAuthenticated: () => auth.isAuthenticated,
  ensureHouseholdCurrent: () => householdJoin.ensureCurrentHousehold(),
})
</script>

<template>
  <BootGate>
    <div class="flex min-h-screen">
      <AppSidebar v-if="showNav && isDesktop" />

      <div class="flex min-w-0 flex-1 flex-col">
        <MobileTopBar v-if="showNav && !isDesktop" />

        <!-- Extra bottom padding on phone widths keeps the content clear of
             the floating tab bar. -->
        <main class="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-32 md:px-8 md:pb-6">
          <RouterView />
        </main>
      </div>

      <BottomNavLayout v-if="showNav && !isDesktop">
        <SpeedDialFab />
        <BottomTabBar />
      </BottomNavLayout>

      <!-- Global hosts: the ownership gate can trigger from any auth flow;
           the household choice from any join/leave/startup-mismatch flow;
           the conflict center opens from the sync badge on any screen. -->
      <OwnershipGateDialog />
      <HouseholdChoiceDialog />
      <ConflictCenter />
    </div>
  </BootGate>
</template>
