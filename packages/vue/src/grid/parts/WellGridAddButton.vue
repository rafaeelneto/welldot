<script setup lang="ts">
/**
 * Default `WellDataGrid` add-row button (`components.addButton`): a pill
 * with a plus icon and `label`. Without a label it renders icon-only. The
 * grid's click listener falls through to the button.
 */
import Button from 'primevue/button';
import IconPlus from '~icons/ph/plus';
import type { WellAddButtonProps } from '../../types';

defineProps<WellAddButtonProps>();
</script>

<template>
  <Button unstyled class="well-grid-add-btn" type="button" :label="label">
    <template #icon>
      <IconPlus />
    </template>
  </Button>
</template>
