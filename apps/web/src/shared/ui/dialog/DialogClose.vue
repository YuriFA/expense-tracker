<script setup lang="ts">
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose as RekaDialogClose, DrawerClose as RekaDrawerClose } from 'reka-ui'
import { computed } from 'vue'
import { injectDialogRootContext, injectDrawerRootContext } from 'reka-ui'

const props = defineProps<DialogCloseProps>()

const dialogContext = injectDialogRootContext(null)
const drawerContext = injectDrawerRootContext(null)
const closeComponent = computed(() =>
  drawerContext !== null && dialogContext === null ? RekaDrawerClose : RekaDialogClose,
)
</script>

<template>
  <component :is="closeComponent" data-slot="dialog-close" v-bind="props">
    <slot />
  </component>
</template>
