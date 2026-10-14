<script setup lang="ts">
import ExamplePicker from './ExamplePicker.vue';

const visible = defineModel<boolean>({ default: false });

const { t } = useI18n();
const viewport = useViewport();
const isMobile = computed(() => viewport.isLessThan('lg'));
</script>

<template>
  <Drawer
    v-model:visible="visible"
    :position="isMobile ? 'bottom' : 'right'"
    :header="t('editor.examples.drawerTitle')"
    :class="isMobile ? 'h-auto max-h-[85vh] rounded-t-2xl' : 'w-104!'"
  >
    <ExamplePicker @loaded="visible = false" />
  </Drawer>
</template>
