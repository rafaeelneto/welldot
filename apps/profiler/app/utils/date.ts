import * as datefns from 'date-fns';

// Date display helpers live in @welldot/utils; re-exported for auto-import.
export {
  formatCalendarDate,
  formatDate,
  fromCalendarDate,
  toCalendarDate,
} from '@welldot/utils';

export function useDateFns() {
  return datefns;
}
