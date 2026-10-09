import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import type { ComponentsDesignTokens, Preset } from '@primeuix/themes/types';

// Cool-slate surface scale (blue-tinted neutrals, light → dark)
const surfaceLight = {
  0: '#ffffff',
  50: '#f7f8fa',
  100: '#eef0f3',
  200: '#d8dde3',
  300: '#b9c0c8',
  400: '#7888a0',
  500: '#4f5d75',
  600: '#3d4a60',
  700: '#2a3344',
  800: '#1a2230',
  900: '#131922',
  950: '#0d1218',
};

// Mirror scale: same hue/chroma, inverted lightness (step N = surfaceLight[950-N])
const contentLight = {
  0: '#0d1218',
  50: '#131922',
  100: '#1a2230',
  200: '#2a3344',
  300: '#3d4a60',
  400: '#4f5d75',
  500: '#7888a0',
  600: '#b9c0c8',
  700: '#d8dde3',
  800: '#eef0f3',
  900: '#f7f8fa',
  950: '#ffffff',
};

// Dark mode: both scales fully inverted so {surface.0} stays the ground
// and {content.0} stays the primary text — same token references work in both modes
const surfaceDark = {
  0: '#0d1218',
  50: '#131922',
  100: '#1a2230',
  200: '#2a3344',
  300: '#3d4a60',
  400: '#4f5d75',
  500: '#7888a0',
  600: '#b9c0c8',
  700: '#d8dde3',
  800: '#eef0f3',
  900: '#f7f8fa',
  950: '#ffffff',
};

const contentDark = {
  0: '#ffffff',
  50: '#f7f8fa',
  100: '#eef0f3',
  200: '#d8dde3',
  300: '#b9c0c8',
  400: '#7888a0',
  500: '#4f5d75',
  600: '#3d4a60',
  700: '#2a3344',
  800: '#1a2230',
  900: '#131922',
  950: '#0d1218',
};

const WelldotAuraPreset = definePreset(Aura, {
  primitive: {
    surface: surfaceLight,
    content: contentLight,
  },

  semantic: {
    primary: {
      50: '#f0f5fc',
      100: '#dde9f8',
      200: '#bdd1f1',
      300: '#92b1e6',
      400: '#5d86d2',
      500: '#2f5fae',
      600: '#29539b',
      700: '#22427d',
      800: '#1a325f',
      900: '#112343',
      950: '#0a172e',
    },
    error: {
      50: 'oklch(97% 0.02 25)',
      100: 'oklch(94% 0.05 25)',
      200: 'oklch(85% 0.11 25)',
      300: 'oklch(72% 0.17 25)',
      400: 'oklch(61% 0.19 25)',
      500: 'oklch(50% 0.20 25)',
      600: 'oklch(43% 0.19 25)',
      700: 'oklch(36% 0.17 25)',
      800: 'oklch(29% 0.14 25)',
      900: 'oklch(23% 0.11 25)',
      950: 'oklch(17% 0.08 25)',
    },
    warning: {
      50: 'oklch(97% 0.02 75)',
      100: 'oklch(94% 0.05 75)',
      200: 'oklch(85% 0.11 75)',
      300: 'oklch(72% 0.17 75)',
      400: 'oklch(61% 0.19 75)',
      500: 'oklch(50% 0.20 75)',
      600: 'oklch(43% 0.19 75)',
      700: 'oklch(36% 0.17 75)',
      800: 'oklch(29% 0.14 75)',
      900: 'oklch(23% 0.11 75)',
      950: 'oklch(17% 0.08 75)',
    },
    success: {
      50: 'oklch(97% 0.02 145)',
      100: 'oklch(94% 0.05 145)',
      200: 'oklch(85% 0.11 145)',
      300: 'oklch(72% 0.17 145)',
      400: 'oklch(61% 0.19 145)',
      500: 'oklch(50% 0.20 145)',
      600: 'oklch(43% 0.19 145)',
      700: 'oklch(36% 0.17 145)',
      800: 'oklch(29% 0.14 145)',
      900: 'oklch(23% 0.11 145)',
      950: 'oklch(17% 0.08 145)',
    },
    info: {
      50: 'oklch(97% 0.02 235)',
      100: 'oklch(94% 0.05 235)',
      200: 'oklch(85% 0.11 235)',
      300: 'oklch(72% 0.17 235)',
      400: 'oklch(61% 0.19 235)',
      500: 'oklch(50% 0.20 235)',
      600: 'oklch(43% 0.19 235)',
      700: 'oklch(36% 0.17 235)',
      800: 'oklch(29% 0.14 235)',
      900: 'oklch(23% 0.11 235)',
      950: 'oklch(17% 0.08 235)',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          inverseColor: '{content.0}',
          hoverColor: '{primary.500}',
          activeColor: '{primary.600}',
        },
        surface: surfaceLight,
        content: contentLight,
        text: {
          color: '{content.0}',
          hoverColor: '{content.50}',
          mutedColor: '{content.400}',
          hoverMutedColor: '{content.300}',
        },
        formField: {
          fontSize: '0.9375rem',
          focusBorderColor: 'none',
          color: '{content.0}',
          background: '{surface.0}',
          borderColor: 'none',
          filledBackground: 'transparent',
          filledHoverBackground: 'transparent',
          filledFocusBackground: 'transparent',
          disabledBackground: '{surface.50}',
          disabledColor: '{content.500}',
          hoverBorderColor: 'none',
          invalidBorderColor: '{error.500}',
          invalidPlaceholderColor: '{content.500}',
          placeholderColor: '{content.500}',
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
        surface: surfaceDark,
        content: contentDark,
        text: {
          color: '{content.0}',
          hoverColor: '{content.50}',
          mutedColor: '{content.400}',
          hoverMutedColor: '{content.300}',
        },
        formField: {
          focusBorderColor: 'none',
          color: '{content.0}',
          background: '{surface.0}',
          borderColor: 'none',
          filledBackground: 'transparent',
          filledHoverBackground: '{surface.200}',
          filledFocusBackground: '{surface.100}',
          disabledBackground: '{surface.50}',
          disabledColor: '{content.400}',
          hoverBorderColor: 'none',
          invalidBorderColor: 'none',
          invalidPlaceholderColor: '{content.0}',
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
    dialog: {
      borderRadius: '1rem',
      header: {
        padding: '1.25rem 1.5rem 1rem',
      },
      title: {
        fontSize: '1.25rem',
        fontWeight: '700',
      },
      content: {
        padding: '0 1.5rem 1.5rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
            borderColor: 'color-mix(in srgb, {content.700} 50%, transparent)',
            color: '{content.0}',
            shadow:
              '0 24px 64px -8px rgba(14, 30, 51, 0.18), 0 2px 16px -2px rgba(14, 30, 51, 0.08)',
          },
        },
        dark: {
          root: {
            background: 'color-mix(in srgb, {surface.50} 88%, transparent)',
            borderColor: 'color-mix(in srgb, {content.700} 60%, transparent)',
            color: '{content.0}',
            shadow:
              '0 24px 64px -8px rgba(0, 0, 0, 0.60), 0 2px 16px -2px rgba(0, 0, 0, 0.40)',
          },
        },
      },
    },
    drawer: {
      header: {
        padding: '1rem 1.25rem',
      },
      title: {
        fontSize: '0.9375rem',
        fontWeight: '600',
      },
      content: {
        padding: '0.5rem 1.25rem 1.25rem',
      },
      footer: {
        padding: '1rem 1.25rem',
      },
      colorScheme: {
        light: {
          root: {
            background: 'rgba(255, 255, 255, 0.92)',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '-20px 0 48px -8px rgba(14, 30, 51, 0.14), -2px 0 8px -2px rgba(14, 30, 51, 0.06)',
          },
        },
        dark: {
          root: {
            background: 'rgba(13, 18, 24, 0.88)',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '-20px 0 48px -8px rgba(0, 0, 0, 0.60), -2px 0 8px -2px rgba(0, 0, 0, 0.40)',
          },
        },
      },
    },
    tabs: {
      tablist: {
        borderWidth: '0 0 1px 0',
        borderColor: '{surface.200}',
        background: 'transparent',
      },
      tab: {
        background: 'transparent',
        hoverBackground: 'transparent',
        activeBackground: 'transparent',
        borderWidth: '0',
        borderColor: 'transparent',
        hoverBorderColor: 'transparent',
        activeBorderColor: 'transparent',
        color: '{content.400}',
        hoverColor: '{content.200}',
        activeColor: '{content.0}',
        padding: '0.875rem 0.25rem',
        fontWeight: '500',
        margin: '0 1.25rem 0 0',
        focus: {
          ring: {
            width: '2px',
            style: 'solid',
            color: '{primary.color}',
            offset: '-2px',
            shadow: 'none',
          },
        },
      },
      tabpanel: {
        background: 'transparent',
        color: '{content.0}',
        padding: '0',
      },
      activeBar: {
        height: '2px',
        bottom: '0px',
        background: '{primary.500}',
      },
      colorScheme: {
        light: {
          activeBar: {
            background: '{primary.600}',
          },
          navButton: {
            background: 'rgba(247, 248, 250, 0.80)',
            color: '{content.400}',
            shadow:
              '0 0 0 1px rgba(216, 221, 227, 0.60), 0 2px 8px rgba(216, 221, 227, 0.40)',
          },
        },
        dark: {
          activeBar: {
            background: '{primary.400}',
          },
          navButton: {
            background: 'rgba(13, 18, 24, 0.80)',
            color: '{content.400}',
            shadow:
              '0 0 0 1px rgba(42, 51, 68, 0.60), 0 2px 8px rgba(42, 51, 68, 0.40)',
          },
        },
      },
    },
    selectbutton: {
      border: {
        radius: '999px',
      },
    },
    select: {
      overlay: {
        borderRadius: '0.75rem',
      },
      colorScheme: {
        light: {
          overlay: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(14,30,51,0.14), 0 1px 6px -1px rgba(14,30,51,0.07)',
          },
          option: {
            color: '{content.0}',
            focusBackground: '{surface.100}',
            focusColor: '{content.0}',
            selectedBackground: '{primary.50}',
            selectedColor: '{primary.700}',
            selectedFocusBackground: '{primary.100}',
            selectedFocusColor: '{primary.700}',
          },
        },
        dark: {
          overlay: {
            background: '{surface.100}',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(0,0,0,0.45), 0 1px 6px -1px rgba(0,0,0,0.28)',
          },
          option: {
            color: '{content.0}',
            focusBackground: '{surface.200}',
            focusColor: '{content.0}',
            selectedBackground: '{surface.200}',
            selectedColor: '{content.0}',
            selectedFocusBackground: '{surface.300}',
            selectedFocusColor: '{content.0}',
          },
        },
      },
    },
    checkbox: {
      root: {
        borderColor: '{content.600}',
        filledBackground: 'transparent',
        checkedBackground: '{primary.600}',
      },
      icon: {
        checkedColor: '{content.950}',
        checkedHoverColor: '{content.950}',
        color: '{content.950}',
      },
    },
    radiobutton: {
      root: {
        borderColor: '{content.600}',
        hoverBorderColor: '{content.400}',
      },
    },
    datepicker: {
      panel: {
        borderRadius: '0.75rem',
        padding: '0.5rem',
      },
      header: {
        padding: '0.5rem 0.75rem 0.25rem',
      },
      title: {
        fontWeight: '600',
      },
      colorScheme: {
        light: {
          panel: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(14,30,51,0.14), 0 1px 6px -1px rgba(14,30,51,0.07)',
          },
          header: {
            background: '{surface.0}',
            borderColor: '{surface.100}',
            color: '{content.0}',
          },
          selectMonth: {
            color: '{content.0}',
            hoverBackground: '{surface.100}',
            hoverColor: '{content.0}',
          },
          selectYear: {
            color: '{content.0}',
            hoverBackground: '{surface.100}',
            hoverColor: '{content.0}',
          },
          weekDay: {
            color: '{content.400}',
          },
          date: {
            color: '{content.0}',
            hoverColor: '{content.0}',
            hoverBackground: '{surface.100}',
            selectedBackground: '{primary.600}',
            selectedColor: '{content.950}',
            rangeSelectedBackground: '{primary.100}',
            rangeSelectedColor: '{primary.700}',
          },
          today: {
            background: '{surface.100}',
            color: '{primary.600}',
          },
          buttonbar: {
            borderColor: '{surface.100}',
          },
        },
        dark: {
          panel: {
            background: '{surface.100}',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(0,0,0,0.45), 0 1px 6px -1px rgba(0,0,0,0.28)',
          },
          header: {
            background: '{surface.100}',
            borderColor: '{surface.200}',
            color: '{content.0}',
          },
          selectMonth: {
            color: '{content.0}',
            hoverBackground: '{surface.200}',
            hoverColor: '{content.0}',
          },
          selectYear: {
            color: '{content.0}',
            hoverBackground: '{surface.200}',
            hoverColor: '{content.0}',
          },
          weekDay: {
            color: '{content.400}',
          },
          date: {
            color: '{content.0}',
            hoverColor: '{content.0}',
            hoverBackground: '{surface.200}',
            selectedBackground: '{primary.500}',
            selectedColor: '{content.950}',
            rangeSelectedBackground: '{primary.900}',
            rangeSelectedColor: '{primary.200}',
          },
          today: {
            background: '{surface.200}',
            color: '{primary.400}',
          },
          buttonbar: {
            borderColor: '{surface.200}',
          },
        },
      },
    },
    button: {
      root: {
        borderRadius: '999px',
        paddingX: '1.125rem',
        paddingY: '0.5625rem',
        gap: '0.5rem',
        iconOnlyWidth: '2.5rem',
        label: {
          fontWeight: '600',
        },
      },
      colorScheme: {
        light: {
          root: {
            primary: {
              background:
                'linear-gradient(180deg, {primary.400}, {primary.600})',
              hoverBackground:
                'linear-gradient(180deg, {primary.300}, {primary.500})',
              activeBackground:
                'linear-gradient(180deg, {primary.500}, {primary.700})',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{content.950}',
              hoverColor: '{content.950}',
              activeColor: '{content.950}',
              focusRing: { color: '{primary.500}', shadow: 'none' },
            },
            secondary: {
              background: '{surface.100}',
              hoverBackground: '{surface.200}',
              activeBackground: '{surface.300}',
              borderColor: '{surface.200}',
              hoverBorderColor: '{surface.300}',
              activeBorderColor: '{surface.300}',
              color: '{content.100}',
              hoverColor: '{content.50}',
              activeColor: '{content.0}',
              focusRing: { color: '{content.400}', shadow: 'none' },
            },
            success: {
              background: '{success.500}',
              hoverBackground: '{success.600}',
              activeBackground: '{success.700}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff',
              focusRing: { color: '{success.500}', shadow: 'none' },
            },
            info: {
              background: '{info.500}',
              hoverBackground: '{info.600}',
              activeBackground: '{info.700}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff',
              focusRing: { color: '{info.500}', shadow: 'none' },
            },
            warn: {
              background: '{warning.500}',
              hoverBackground: '{warning.600}',
              activeBackground: '{warning.700}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff',
              focusRing: { color: '{warning.500}', shadow: 'none' },
            },
            danger: {
              background: '{error.500}',
              hoverBackground: '{error.600}',
              activeBackground: '{error.700}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '#ffffff',
              hoverColor: '#ffffff',
              activeColor: '#ffffff',
              focusRing: { color: '{error.500}', shadow: 'none' },
            },
            contrast: {
              background: '{content.0}',
              hoverBackground: '{content.50}',
              activeBackground: '{content.100}',
              borderColor: '{content.0}',
              hoverBorderColor: '{content.0}',
              activeBorderColor: '{content.0}',
              color: '{surface.0}',
              hoverColor: '{surface.0}',
              activeColor: '{surface.0}',
              focusRing: { color: '{content.0}', shadow: 'none' },
            },
          },
          outlined: {
            primary: {
              hoverBackground: '{primary.50}',
              activeBackground: '{primary.100}',
              borderColor: '{primary.200}',
              color: '{primary.600}',
            },
            secondary: {
              hoverBackground: '{surface.50}',
              activeBackground: '{surface.100}',
              borderColor: '{surface.200}',
              color: '{content.300}',
            },
            success: {
              hoverBackground: '{success.50}',
              activeBackground: '{success.100}',
              borderColor: '{success.200}',
              color: '{success.500}',
            },
            info: {
              hoverBackground: '{info.50}',
              activeBackground: '{info.100}',
              borderColor: '{info.200}',
              color: '{info.500}',
            },
            warn: {
              hoverBackground: '{warning.50}',
              activeBackground: '{warning.100}',
              borderColor: '{warning.200}',
              color: '{warning.500}',
            },
            danger: {
              hoverBackground: '{error.50}',
              activeBackground: '{error.100}',
              borderColor: '{error.200}',
              color: '{error.500}',
            },
            contrast: {
              hoverBackground: '{surface.50}',
              activeBackground: '{surface.100}',
              borderColor: '{content.200}',
              color: '{content.0}',
            },
          },
          text: {
            primary: {
              hoverBackground: '{primary.50}',
              activeBackground: '{primary.100}',
              color: '{primary.600}',
            },
            secondary: {
              hoverBackground: '{surface.50}',
              activeBackground: '{surface.100}',
              color: '{content.300}',
            },
            success: {
              hoverBackground: '{success.50}',
              activeBackground: '{success.100}',
              color: '{success.500}',
            },
            info: {
              hoverBackground: '{info.50}',
              activeBackground: '{info.100}',
              color: '{info.500}',
            },
            warn: {
              hoverBackground: '{warning.50}',
              activeBackground: '{warning.100}',
              color: '{warning.500}',
            },
            danger: {
              hoverBackground: '{error.50}',
              activeBackground: '{error.100}',
              color: '{error.500}',
            },
            contrast: {
              hoverBackground: '{surface.50}',
              activeBackground: '{surface.100}',
              color: '{content.0}',
            },
          },
          link: {
            color: '{primary.600}',
            hoverColor: '{primary.500}',
            activeColor: '{primary.700}',
          },
        },
        dark: {
          root: {
            primary: {
              background:
                'linear-gradient(180deg, {primary.300}, {primary.500})',
              hoverBackground:
                'linear-gradient(180deg, {primary.200}, {primary.400})',
              activeBackground:
                'linear-gradient(180deg, {primary.400}, {primary.600})',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{content.0}',
              hoverColor: '{content.0}',
              activeColor: '{content.0}',
              focusRing: { color: '{primary.400}', shadow: 'none' },
            },
            secondary: {
              background: '{surface.100}',
              hoverBackground: '{surface.200}',
              activeBackground: '{surface.300}',
              borderColor: '{surface.200}',
              hoverBorderColor: '{surface.300}',
              activeBorderColor: '{surface.300}',
              color: '{content.100}',
              hoverColor: '{content.50}',
              activeColor: '{content.0}',
              focusRing: { color: '{content.400}', shadow: 'none' },
            },
            success: {
              background: '{success.400}',
              hoverBackground: '{success.300}',
              activeBackground: '{success.200}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{success.950}',
              hoverColor: '{success.950}',
              activeColor: '{success.950}',
              focusRing: { color: '{success.400}', shadow: 'none' },
            },
            info: {
              background: '{info.400}',
              hoverBackground: '{info.300}',
              activeBackground: '{info.200}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{info.950}',
              hoverColor: '{info.950}',
              activeColor: '{info.950}',
              focusRing: { color: '{info.400}', shadow: 'none' },
            },
            warn: {
              background: '{warning.400}',
              hoverBackground: '{warning.300}',
              activeBackground: '{warning.200}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{warning.950}',
              hoverColor: '{warning.950}',
              activeColor: '{warning.950}',
              focusRing: { color: '{warning.400}', shadow: 'none' },
            },
            danger: {
              background: '{error.400}',
              hoverBackground: '{error.300}',
              activeBackground: '{error.200}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{error.950}',
              hoverColor: '{error.950}',
              activeColor: '{error.950}',
              focusRing: { color: '{error.400}', shadow: 'none' },
            },
            contrast: {
              background: '{content.0}',
              hoverBackground: '{content.50}',
              activeBackground: '{content.100}',
              borderColor: '{content.0}',
              hoverBorderColor: '{content.0}',
              activeBorderColor: '{content.0}',
              color: '{surface.0}',
              hoverColor: '{surface.0}',
              activeColor: '{surface.0}',
              focusRing: { color: '{content.0}', shadow: 'none' },
            },
          },
          outlined: {
            primary: {
              hoverBackground:
                'color-mix(in srgb, {primary.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {primary.400} 25%, transparent)',
              borderColor: '{primary.700}',
              color: '{primary.400}',
            },
            secondary: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
              borderColor: '{surface.300}',
              color: '{content.200}',
            },
            success: {
              hoverBackground:
                'color-mix(in srgb, {success.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {success.400} 25%, transparent)',
              borderColor: '{success.700}',
              color: '{success.400}',
            },
            info: {
              hoverBackground:
                'color-mix(in srgb, {info.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {info.400} 25%, transparent)',
              borderColor: '{info.700}',
              color: '{info.400}',
            },
            warn: {
              hoverBackground:
                'color-mix(in srgb, {warning.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {warning.400} 25%, transparent)',
              borderColor: '{warning.700}',
              color: '{warning.400}',
            },
            danger: {
              hoverBackground:
                'color-mix(in srgb, {error.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {error.400} 25%, transparent)',
              borderColor: '{error.700}',
              color: '{error.400}',
            },
            contrast: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
              borderColor: '{content.700}',
              color: '{content.0}',
            },
          },
          text: {
            primary: {
              hoverBackground:
                'color-mix(in srgb, {primary.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {primary.400} 25%, transparent)',
              color: '{primary.400}',
            },
            secondary: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
              color: '{content.300}',
            },
            success: {
              hoverBackground:
                'color-mix(in srgb, {success.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {success.400} 25%, transparent)',
              color: '{success.400}',
            },
            info: {
              hoverBackground:
                'color-mix(in srgb, {info.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {info.400} 25%, transparent)',
              color: '{info.400}',
            },
            warn: {
              hoverBackground:
                'color-mix(in srgb, {warning.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {warning.400} 25%, transparent)',
              color: '{warning.400}',
            },
            danger: {
              hoverBackground:
                'color-mix(in srgb, {error.400} 15%, transparent)',
              activeBackground:
                'color-mix(in srgb, {error.400} 25%, transparent)',
              color: '{error.400}',
            },
            contrast: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
              color: '{content.0}',
            },
          },
          link: {
            color: '{primary.400}',
            hoverColor: '{primary.300}',
            activeColor: '{primary.500}',
          },
        },
      },
    },
    inputtext: {
      colorScheme: {
        light: {
          root: {
            filledBackground: '{surface.0}',
            filledHoverBackground: '{surface.100}',
            filledFocusBackground: '{surface.50}',
          },
        },
        dark: {
          root: {
            filledBackground: '{surface.200}',
            filledHoverBackground: '{surface.300}',
            filledFocusBackground: '{surface.200}',
          },
        },
      },
    },
    listbox: {
      root: {
        borderRadius: '0.75rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            invalidBorderColor: '{error.500}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(14,30,51,0.14), 0 1px 6px -1px rgba(14,30,51,0.07)',
          },
          option: {
            color: '{content.0}',
            focusBackground: '{surface.100}',
            focusColor: '{content.0}',
            selectedBackground: '{primary.50}',
            selectedColor: '{primary.700}',
            selectedFocusBackground: '{primary.100}',
            selectedFocusColor: '{primary.700}',
            stripedBackground: '{surface.50}',
          },
          optionGroup: {
            background: 'transparent',
            color: '{content.400}',
          },
          checkmark: {
            color: '{primary.600}',
          },
        },
        dark: {
          root: {
            background: '{surface.100}',
            borderColor: '{surface.200}',
            invalidBorderColor: '{error.500}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(0,0,0,0.45), 0 1px 6px -1px rgba(0,0,0,0.28)',
          },
          option: {
            color: '{content.0}',
            focusBackground: '{surface.200}',
            focusColor: '{content.0}',
            selectedBackground: '{surface.200}',
            selectedColor: '{content.0}',
            selectedFocusBackground: '{surface.300}',
            selectedFocusColor: '{content.0}',
            stripedBackground: '{surface.200}',
          },
          optionGroup: {
            background: 'transparent',
            color: '{content.400}',
          },
          checkmark: {
            color: '{primary.400}',
          },
        },
      },
    },
    popover: {
      root: {
        borderRadius: '0.75rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(14,30,51,0.14), 0 1px 6px -1px rgba(14,30,51,0.07)',
          },
        },
        dark: {
          root: {
            background: '{surface.100}',
            borderColor: '{surface.200}',
            color: '{content.0}',
            shadow:
              '0 8px 32px -4px rgba(0,0,0,0.45), 0 1px 6px -1px rgba(0,0,0,0.28)',
          },
        },
      },
    },
    tooltip: {
      root: {
        padding: '0.375rem 0.625rem',
        borderRadius: '0.5rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
            color: '{content.300}',
            shadow:
              '0 8px 32px -4px rgba(14,30,51,0.14), 0 1px 6px -1px rgba(14,30,51,0.07)',
          },
        },
        dark: {
          root: {
            background: '{surface.100}',
            color: '{content.300}',
            shadow:
              '0 8px 32px -4px rgba(0,0,0,0.45), 0 1px 6px -1px rgba(0,0,0,0.28)',
          },
        },
      },
      css: ({ dt }) => `
        .p-tooltip-text {
          font-size: 0.8125rem;
          line-height: 1.4;
          border: 1px solid ${dt('surface.200')};
        }
      `,
    },
    accordion: {
      colorScheme: {
        light: {
          content: {
            background: '{surface.0}',
          },
        },
        dark: {
          content: {
            background: '{surface.0}',
          },
        },
      },
    },
  } as ComponentsDesignTokens,
} as Preset);

/**
 * PrimeVue theme configuration for welldot apps — the Aura preset with the
 * cool-slate surface/content scales and the welldot primary palette.
 *
 * @example
 * app.use(PrimeVue, { theme: WelldotPreset, pt: welldotPt })
 */
export const WelldotPreset = {
  preset: WelldotAuraPreset,
  options: {
    prefix: 'w',
    darkModeSelector: '.dark-mode',
    cssLayer: {
      name: 'primevue',
      order: 'theme, base, primevue',
    },
  },
};
