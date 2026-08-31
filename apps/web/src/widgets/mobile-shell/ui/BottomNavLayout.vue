<template>
  <!-- Owns the bottom chrome positioning: the bar and the FAB sit above the
       content, the safe-area inset clears notched-device home indicators
       (web-screens: mobile navigation shell). -->
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center pb-[max(0.75rem,env(safe-area-inset-bottom))]"
  >
    <slot />
  </div>
</template>
