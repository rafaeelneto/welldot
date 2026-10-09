<script setup lang="ts">
/**
 * Default `WellDataGrid` delete-row button (`components.deleteButton`). The
 * × is drawn by `grid.css` (`.well-grid-delete-btn::before`); `label` becomes
 * the aria-label. The cell's click listener falls through to the button.
 */
import type { WellDeleteButtonProps } from '../../types';

defineProps<WellDeleteButtonProps>();
</script>

<template>
  <button class="well-grid-delete-btn" type="button" :aria-label="label" />
</template>
