import type { PrimeVuePTOptions } from 'primevue/config';

/**
 * Global PrimeVue pass-through classes for welldot apps (Tailwind utilities
 * resolved against the `@welldot/vue/tailwind.css` tokens). Pass it as
 * `pt` to PrimeVue together with `WelldotPreset` and `unstyled: false`.
 */
// Asserted, not annotated: PrimeVue's PT typings omit some real sections
// (e.g. `inputnumber.pcInput`, `datepicker.pcInput`).
export const welldotPt = {
  selectbutton: {
    root: 'inline-flex items-center bg-surface-100 rounded-full p-0.5 gap-0.5',
    pcToggleButton: {
      root: 'border-none bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
      content: ({ context }: { context: { active?: boolean } }) => {
        return [
          'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium font-display',
          'transition-all duration-200',
          context.active
            ? 'bg-content-0 text-surface-0 shadow-sm'
            : 'bg-transparent text-content-400 hover:text-content-200',
        ];
      },
    },
  },
  tabs: {
    root: 'font-display flex flex-col flex-1 min-h-0 overflow-hidden',
  },
  tab: {
    root: 'font-display text-[13px] outline-none cursor-pointer transition-colors duration-150 bg-transparent border-none',
  },
  tabpanels: {
    root: 'flex-1 overflow-hidden',
  },
  tabpanel: {
    root: 'h-full overflow-y-auto',
  },
  drawer: {
    root: 'font-display backdrop-saturate-150 backdrop-blur-2xl',
    header: 'border-b border-surface-200/60',
    title: 'font-serif tracking-tight',
    content: 'overflow-y-auto',
    footer: 'border-t border-surface-200/60',
    mask: { class: 'backdrop-blur-[2px]' },
  },
  button: {
    root: () => {
      return 'font-display transition-all duration-200 hover:scale-[1.02] active:scale-95 group border-none';
    },
    label:
      'font-display transition-all duration-200 hover:scale-[1.02] active:scale-95',
  },
  inputtext: {
    root: 'w-full font-mono border-content-600 py-[5px] border-[1px] text-[12px] rounded-[var(--radius-sm)] focus:shadow-[inset_0_0_0_1.5px_var(--color-focus-ring)] [&.p-invalid]:shadow-[inset_0_0_0_1.5px_var(--color-error-ring)]',
  },
  inputnumber: {
    pcInput: {
      root: 'w-full font-mono border-content-600 border-[1px] py-[5px] text-[12px] rounded-[var(--radius-sm)] focus:shadow-[inset_0_0_0_1.5px_var(--color-focus-ring)] [&.p-invalid]:shadow-[inset_0_0_0_1.5px_var(--color-error-ring)]',
    },
  },
  select: {
    root: 'font-mono border-content-600 border-[1px] py-[5px] rounded-[var(--radius-sm)] [&.p-focus]:shadow-[inset_0_0_0_1.5px_var(--color-focus-ring)] [&.p-invalid]:shadow-[inset_0_0_0_1.5px_var(--color-error-ring)]',
    label: 'font-mono py-0 px-2 text-[12px]',
    overlay: 'font-mono',
    option: 'font-mono',
  },
  textarea: {
    root: 'font-mono border-content-600 border-[1px] py-[5px] text-[12px] rounded-[var(--radius-sm)] focus:shadow-[inset_0_0_0_1.5px_var(--color-focus-ring)] [&.p-invalid]:shadow-[inset_0_0_0_1.5px_var(--color-error-ring)]',
  },
  datepicker: {
    panel: 'font-display',
    title: 'font-display font-semibold tracking-tight',
    selectMonth: 'font-display',
    selectYear: 'font-display',
    weekDay: 'font-display text-xs uppercase tracking-wide',
    day: 'font-mono text-[12px]',
    pcInput: {
      root: 'font-mono border-content-600 border-[1px] py-[5px] text-[12px] rounded-[var(--radius-sm)] focus:shadow-[inset_0_0_0_1.5px_var(--color-focus-ring)] [&.p-invalid]:shadow-[inset_0_0_0_1.5px_var(--color-error-ring)]',
    },
  },
  dialog: {
    root: 'font-display backdrop-blur-2xl backdrop-saturate-150',
    title: 'font-mono tracking-tight',
    header: (options: {
      props: { header?: unknown };
      instance: { $slots: object };
    }) => {
      const hasHeader =
        options.props.header || 'header' in options.instance.$slots;
      return {
        class: hasHeader ? 'justify-between' : 'justify-end',
      };
    },
    mask: {
      class: 'backdrop-blur-[3px] bg-surface-900/10 dark:bg-surface-950/30',
    },
  },
  confirmdialog: {
    root: 'font-display backdrop-blur-2xl backdrop-saturate-150',
    title: 'font-mono tracking-tight',
    header: 'pb-0',
    content: 'px-6 py-4',
    footer: 'flex justify-end gap-2 pt-0',
    mask: {
      class: 'backdrop-blur-[3px] bg-surface-900/10 dark:bg-surface-950/30',
    },
  },
} as PrimeVuePTOptions;
