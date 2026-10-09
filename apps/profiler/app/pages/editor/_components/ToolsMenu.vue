<script setup lang="ts">
export interface ToolItem {
  label: string;
  icon: string;
  description?: string;
  disabled?: boolean;
  /** Renders a "Soon" badge next to the label. Purely cosmetic. */
  comingSoon?: boolean;
  /** Keeps the item in the desktop drawer, which otherwise only lists tools
   *  that have no dedicated button in the nav. */
  alwaysInMenu?: boolean;
  onClick?: () => void;
}

const props = defineProps<{ items: ToolItem[] }>();

const visible = defineModel<boolean>({ default: false });

const { t } = useI18n();

const viewport = useViewport();
const isMobile = computed(() => viewport.isLessThan('lg'));

function selectItem(item: ToolItem) {
  if (item.disabled) return;
  item.onClick?.();
  visible.value = false;
}

const itemBtnPt = {
  root: {
    class: [
      'flex items-center gap-4 p-3 rounded-lg border border-surface-200 text-left w-full',
      'hover:border-primary-300 hover:bg-surface-50 transition-colors cursor-pointer',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-surface-200 disabled:hover:bg-transparent',
    ],
  },
};
</script>

<template>
  <Drawer
    v-model:visible="visible"
    :position="isMobile ? 'bottom' : 'right'"
    :class="isMobile ? 'h-auto max-h-[85vh] rounded-t-2xl' : 'w-104!'"
  >
    <div class="flex flex-col gap-2 pt-1">
      <Button
        v-for="item in props.items"
        :key="item.label"
        :disabled="item.disabled"
        unstyled
        :pt="itemBtnPt"
        @click="selectItem(item)"
      >
        <Icon
          :name="item.icon"
          class="size-6 shrink-0"
          :class="item.disabled ? 'text-content-400' : 'text-primary-500'"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm text-content-0">
              {{ item.label }}
            </span>
            <span
              v-if="item.comingSoon"
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-100 text-content-400 tracking-wider uppercase"
            >
              {{ t('editor.shareDialog.comingSoon') }}
            </span>
          </div>
          <div v-if="item.description" class="text-xs text-content-400 mt-0.5">
            {{ item.description }}
          </div>
        </div>
      </Button>
    </div>
  </Drawer>
</template>
