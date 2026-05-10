import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e0fff8',
      100: '#b3fff0',
      200: '#80ffe6',
      300: '#4dffdc',
      400: '#1affd2',
      500: '#00ffc6',
      600: '#00cca0',
      700: '#00997a',
      800: '#006655',
      900: '#00332f',
      950: '#001916',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          inverseColor: '{content.0}',
          hoverColor: '{primary.500}',
          activeColor: '{primary.600}',
        },
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        content: {
          0: '#000000',
          50: '#171717',
          100: '#262626',
          200: '#404040',
          300: '#525252',
          400: '#737373',
          500: '#a3a3a3',
          600: '#d4d4d4',
          700: '#e5e5e5',
          800: '#f5f5f5',
          900: '#fafafa',
          950: '#ffffff',
        },
        formField: {
          focusBorderColor: 'none',
          color: '{content.0}',
          background: '{surface.0}',
          borderColor: 'none',
          filledBackground: '{surface.200}',
          filledHoverBackground: '{surface.200}',
          filledFocusBackground: '{surface.200}',
          disabledBackground: '{surface.100}',
          hoverBorderColor: 'none',
          invalidBorderColor: '{red.300}',
          invalidPlaceholderColor: '{red.400}',
          placeholderColor: '{content.400}',
          floatLabelColor: '{content.200}',
          floatLabelFocusColor: '{primary.500}',
          floatLabelInvalidColor: '{red.400}',
          iconColor: '{content.50}',
          shadow: '0 0 #0000, 0 0 #0000, 0 1px 2px 0 rgba(18, 18, 23, 0.05)',
        },
      },
      dark: {
        primary: {
          color: '{primary.500}',
          inverseColor: '{content.0}',
          hoverColor: '{primary.600}',
          activeColor: '{primary.500}',
        },
        surface: {
          0: '#181825',
          50: '#1e1e2e',
          100: '#26263a',
          200: '#2e2e45',
          300: '#383856',
          400: '#434368',
          500: '#515178',
          600: '#636389',
          700: '#8383a3',
          800: '#b5b5c8',
          900: '#e0e0ec',
          950: '#ffffff',
        },
        content: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',

          background: '{surface.0}',
          hoverBackground: '{surface.50}',
          color: '{content.0}',
          hoverColor: '{content.100}',
          borderColor: '{content.400}',
        },
        text: {
          color: '{content.0}',
          hoverColor: '{content.100}',
          mutedColor: '{content.400}',
          hoverMutedColor: '{content.300}',
        },
        formField: {
          focusBorderColor: '{primary.400}',
          color: '{content.0}',
          background: '{surface.0}',
          borderColor: 'none',
          filledBackground: '{surface.200}',
          filledHoverBackground: '{surface.200}',
          filledFocusBackground: '{surface.200}',
          disabledBackground: '{surface.100}',
          hoverBorderColor: '{primary.400}',
          invalidBorderColor: '{red.300}',
          invalidPlaceholderColor: '{red.400}',
          placeholderColor: '{content.400}',
          floatLabelColor: '{content.200}',
          floatLabelFocusColor: '{primary.500}',
          floatLabelInvalidColor: '{red.400}',
          iconColor: '{content.50}',
          shadow: '0 0 #0000, 0 0 #0000, 0 1px 2px 0 rgba(18, 18, 23, 0.05)',
        },
      },
    },
  },
  components: {
    message: {
      text: {
        sm: { fontSize: '0.75rem' },
      },
    },
    button: {
      colorScheme: {
        dark: {
          root: {
            primary: {
              color: '{content.950}',
              hoverColor: '{content.950}',
              activeColor: '{content.950}',
              background: `
                linear-gradient(135deg, {primary.400} 0%, {primary.500} 25%, {primary.600} 75%, {primary.600} 100%),
                radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
                linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)
              `,
              hoverBackground: `
                linear-gradient(135deg, {primary.400} 0%, {primary.500} 25%, {primary.600} 75%, {primary.700} 100%),
                radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 50%),
                linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%)
              `,
              activeBackground: `
                linear-gradient(135deg, {primary.600} 0%, {primary.700} 25%, {primary.800} 75%, {primary.900} 100%),
                radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)
              `,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
      },
    },
    checkbox: {
      colorScheme: {
        dark: {
          icon: {
            checkedColor: '{content.950}',
            color: '{content.950}',
            checkedHoverColor: '{content.950}',
          },
        },
      },
    },
    toggleswitch: {
      colorScheme: {
        dark: {
          root: {
            checkedBackground: '{primary.600}',
          },
        },
      },
    },
    dialog: {
      colorScheme: {
        light: {
          root: { background: '{surface.0}' },
        },
        dark: {
          root: {
            background: '{surface.0}',
            borderColor: 'none',
            shadow: '0 0 0 1px rgba(0, 255, 198, 0.12), 0 2px 8px -2px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    select: {
      overlay: { background: '{surface.0}', color: '{content.0}' },
      option: { focusBackground: '{surface.400}' },
    },
    multiselect: {
      overlay: { background: '{surface.0}', color: '{content.0}' },
      option: { focusBackground: '{surface.400}' },
    },
    toast: {
      colorScheme: {
        light: {
          success: { detailColor: '{content.0}' },
          error: { detailColor: '{content.0}' },
        },
        dark: {
          success: { detailColor: '{content.0}' },
          error: { detailColor: '{content.0}' },
        },
      },
    },
    togglebutton: {
      colorScheme: {
        dark: {
          root: {
            background: '{surface.50}',
            checkedBackground: '{surface.50}',
            hoverBackground: '{surface.200}',
            hoverColor: '{content.0}',
            borderColor: 'transparent',
            checkedBorderColor: 'transparent',
            color: '{content.0}',
            checkedColor: '{primary.0}',
          },
          content: {
            checkedBackground: '{primary.600}',
          },
        },
      },
    },
  },
});

export default {
  preset: MyPreset,
  options: {
    darkModeSelector: '.dark-mode',
    cssLayer: {
      name: 'primevue',
      order: 'theme, base, primevue',
    },
  },
};
