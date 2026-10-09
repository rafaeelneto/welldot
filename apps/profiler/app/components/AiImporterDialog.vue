<script setup lang="ts">
const visible = defineModel<boolean>({ default: false });

const { t } = useI18n();
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="t('editor.aiImporter.title')"
    :style="{ width: '28rem' }"
  >
    <div class="flex flex-col gap-4 pt-1">
      <Message severity="warn">
        <template #icon>
          <Icon name="ph:warning-duotone" class="size-4 shrink-0" />
        </template>
        {{ t('editor.aiImporter.comingSoon') }}
      </Message>

      <p class="text-sm text-content-300">
        {{ t('editor.aiImporter.description') }}
      </p>
    </div>

    <template #footer>
      <Button
        :label="t('editor.aiImporter.close')"
        severity="secondary"
        text
        @click="visible = false"
      />
    </template>
  </Dialog>
</template>
