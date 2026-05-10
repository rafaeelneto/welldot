const customPt = {
  button: {
    root: 'transition-all duration-200 hover:scale-[1.02] active:scale-95 group',
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
