const customPt = {
  button: {
    root: 'font-display transition-all duration-200 hover:scale-[1.02] active:scale-95 group',
    label: 'font-display font-medium',
  },
  inputtext: {
    root: 'font-mono text-sm rounded-[var(--radius-sm)] focus:shadow-[inset_0_0_0_1.5px_var(--w-primary-500)]',
  },
  dialog: {
    header: (options) => {
      const hasHeader = options.props.header || 'header' in options.instance.$slots;
      return {
        class: hasHeader ? 'justify-between' : 'justify-end',
      };
    },
    mask: (options) => {
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
