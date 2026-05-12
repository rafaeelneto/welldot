type NavigationEvents = {
  'navigation:changed': { from: string; to: string };
};

type WellEvents = {
  'well:loaded': { id: string };
  'well:saved': { id: string };
  'well:deleted': { id: string };
};

type ThemeEvents = {
  'theme:changed': { mode: 'light' | 'dark' };
};

export type AppEvents = NavigationEvents & WellEvents & ThemeEvents;
