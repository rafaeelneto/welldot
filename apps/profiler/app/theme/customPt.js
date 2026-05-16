const customPt = {
  selectbutton: {
    root: 'inline-flex items-center bg-surface-100 rounded-full p-0.5 gap-0.5',
    pcToggleButton: {
      root: 'border-none bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
      content: ({ context }) => {
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
  tablist: {
    content: 'px-4 lg:px-6',
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
    root: 'font-mono text-sm rounded-[var(--radius-sm)] focus:shadow-[inset_0_0_0_1.5px_var(--w-primary-500)]',
  },
  dialog: {
    header: options => {
      const hasHeader =
        options.props.header || 'header' in options.instance.$slots;
      return {
        class: hasHeader ? 'justify-between' : 'justify-end',
      };
    },
    mask: options => {
      const hasHeader = options.props.mask || 'mask' in options.instance.$slots;
      if (!hasHeader) {
        return {};
      }
      return {
        class: () => 'backdrop-blur-sm bg-black/30',
      };
    },
  },
};

export default customPt;
