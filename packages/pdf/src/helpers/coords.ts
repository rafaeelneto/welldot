export type CoordFormat = 'DD' | 'DMS';

export function ddToDms(dd: number, isLat: boolean): string {
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = (minFull - min) * 60;

  const dir = isLat ? (dd >= 0 ? 'N' : 'S') : dd >= 0 ? 'E' : 'W';

  return `${deg}°${min}'${sec.toFixed(2)}"${dir}`;
}

export function formatCoord(
  dd: number,
  format: CoordFormat,
  isLat: boolean,
): string {
  if (format === 'DMS') return ddToDms(dd, isLat);
  return dd.toFixed(6);
}
