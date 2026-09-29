<script setup lang="ts">
defineProps<{
  name?: string;
  info?: string;
  infoHighlight?: string;
}>();
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
      <InfoPopover :info="info">
        <div class="flex flex-col gap-2.5">
          <p class="m-0">{{ info }}</p>
          <p
            v-if="infoHighlight"
            class="m-0 flex items-start gap-1.5 rounded-md border border-primary-500/30 bg-primary-500/10 px-2.5 py-2 text-content-0"
          >
            <Icon
              name="ph:pencil-simple"
              class="size-3.5 shrink-0 mt-0.5 text-primary-500"
            />
            <span>{{ infoHighlight }}</span>
          </p>
        </div>
      </InfoPopover>
    </span>
  </span>
</template>
