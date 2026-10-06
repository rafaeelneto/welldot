<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
  <p class="m-0 text-sm italic text-content-400">{{ text }}</p>
</template>
