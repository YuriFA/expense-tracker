<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from './AppNav.vue'
import BootGate from './BootGate.vue'
import { OwnershipGateDialog, useAuthStore } from '@/entities/session'
import { ConflictCenter } from '@/features/sync-conflicts'
import { HouseholdChoiceDialog, useHouseholdJoinStore } from '@/features/household-join'
import { provideSyncController } from '@/shared/lib/local-db'

const route = useRoute()
// Auth entry points (login/register/verify/reset) render full-screen without
// the app navigation.
const showNav = computed(() => !route.meta.public)

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
    <div class="min-h-screen">
      <AppNav v-if="showNav" />

      <main class="mx-auto max-w-5xl px-4 py-6">
        <RouterView />
      </main>

      <!-- Global hosts: the ownership gate can trigger from any auth flow;
           the household choice from any join/leave/startup-mismatch flow;
           the conflict center opens from the sync badge on any screen. -->
      <OwnershipGateDialog />
      <HouseholdChoiceDialog />
      <ConflictCenter />
    </div>
  </BootGate>
</template>
