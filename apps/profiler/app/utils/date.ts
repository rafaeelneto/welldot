import * as datefns from 'date-fns';

export function useDateFns() {
  return datefns;
}

export function formatDate(date: Date | string | undefined, format = 'dd/MM/yyyy HH:mm'): string {
  if (!date) return '';

  let dateToFormat = date;
  if (typeof date === 'string') {
    dateToFormat = new Date(date);
  }
  if (!(dateToFormat instanceof Date) || isNaN(dateToFormat.getTime())) {
    return '';
  }
  return datefns.format(dateToFormat, format);
}
