<script setup lang="ts">
/** Column header with an info popover. Text arrives resolved. */
import IconPencilSimple from '~icons/ph/pencil-simple';
import WellInfoPopover from '../../components/WellInfoPopover.vue';

defineProps<{
  name?: string;
  info?: string;
  infoHighlight?: string;
  /** Accessible label of the info trigger. */
  infoLabel?: string;
}>();

defineOptions({ inheritAttrs: false });
</script>

<template>
  <span class="inline-flex items-center gap-1 min-w-0">
    <span class="truncate">{{ name }}</span>
    <span
      v-if="info"
      class="inline-flex shrink-0 normal-case tracking-normal"
      @click.stop
      @mousedown.stop
    >
      <WellInfoPopover :info="info" :label="infoLabel">
        <div class="flex flex-col gap-2.5">
          <p class="m-0">{{ info }}</p>
          <p
            v-if="infoHighlight"
            class="m-0 flex items-start gap-1.5 rounded-md border border-primary-500/30 bg-primary-500/10 px-2.5 py-2 text-content-0"
          >
            <IconPencilSimple
              class="size-3.5 shrink-0 mt-0.5 text-primary-500"
            />
            <span>{{ infoHighlight }}</span>
          </p>
        </div>
      </WellInfoPopover>
    </span>
  </span>
</template>
