<script setup lang="ts">
// The global auth middleware redirects "/" to the role home page (or /login).
definePageMeta({ layout: 'auth' })
</script>

<template>
  <div class="grid min-h-dvh place-items-center">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
  </div>
</template>
