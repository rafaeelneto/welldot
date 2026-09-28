import 'driver.js/dist/driver.css';

interface StartupTip {
  /** Stable key persisted in `uiStore.dismissedTips`. */
  id: string;
  titleKey: string;
  bodyKey: string;
  /** CSS selector of the element to highlight. */
  target: (isMobile: boolean) => string;
  /** Optional primary action shown instead of the plain "Got it" button. */
  action?: { labelKey: string; run: () => void };
}

const TIP_INDEX_KEY = 'welldot_tip_index';
const SHOW_DELAY_MS = 800;

/**
 * Shows one not-yet-dismissed tip each time the editor starts, highlighting
 * the UI element it refers to. To add a tip: append an entry below, put a
 * matching `data-tip` attribute on the target element and add the
 * `tips.<name>` locale keys.
 */
export function useStartupTips() {
  const { t } = useI18n();
  const uiStore = useUiStore();
  const bus = useBus();
  const viewport = useViewport();

  const tips: StartupTip[] = [
    {
      id: 'units-settings',
      titleKey: 'tips.units.title',
      bodyKey: 'tips.units.body',
      target: isMobile =>
        isMobile ? '[data-tip="settings-mobile"]' : '[data-tip="settings"]',
      action: {
        labelKey: 'tips.units.action',
        run: () => bus.emit('ui:open-settings', undefined),
      },
    },
  ];

  function _pickTip(): StartupTip | undefined {
    const pending = tips.filter(tip => !uiStore.dismissedTips.includes(tip.id));
    if (!pending.length) return undefined;

    // Rotate through pending tips across page loads.
    let index = 0;
    try {
      index = Number(localStorage.getItem(TIP_INDEX_KEY)) || 0;
      localStorage.setItem(TIP_INDEX_KEY, String(index + 1));
    } catch {
      // storage unavailable — always start from the first tip
    }
    return pending[index % pending.length];
  }

  async function _show(tip: StartupTip) {
    const isMobile = viewport.isLessThan('lg');
    const element = document.querySelector(tip.target(isMobile));
    if (!element) return;

    const { driver } = await import('driver.js');

    let dontShowAgain = false;
    const buttonLabel = t(tip.action?.labelKey ?? 'tips.gotIt');

    const tour = driver({
      popoverClass: 'welldot-tip',
      stagePadding: 6,
      stageRadius: 10,
      overlayOpacity: 0.45,
      smoothScroll: true,
      onPopoverRender: popover => {
        const label = document.createElement('label');
        label.className = 'welldot-tip-dismiss';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
          dontShowAgain = checkbox.checked;
        });
        label.append(
          checkbox,
          document.createTextNode(t('tips.dontShowAgain')),
        );
        popover.footer.prepend(label);
      },
      onDestroyed: () => {
        if (dontShowAgain && !uiStore.dismissedTips.includes(tip.id)) {
          uiStore.dismissedTips.push(tip.id);
        }
      },
    });

    tour.highlight({
      element,
      popover: {
        title: t(tip.titleKey),
        description: t(tip.bodyKey),
        side: 'bottom',
        align: 'end',
        showButtons: ['next', 'close'],
        nextBtnText: buttonLabel,
        doneBtnText: buttonLabel,
        onNextClick: () => {
          tour.destroy();
          tip.action?.run();
        },
      },
    });
  }

  function showStartupTip() {
    if (!import.meta.client) return;
    const tip = _pickTip();
    if (!tip) return;
    // Let the layout settle before measuring the target element.
    setTimeout(() => _show(tip), SHOW_DELAY_MS);
  }

  return { showStartupTip };
}
