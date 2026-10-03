/** "Now" for the snapshot: relative times are measured from when it was taken. */
export const SNAPSHOT_NOW = Date.parse('2026-10-02T23:30:00+01:00');

export function timeAgo(iso: string | undefined) {
  if (!iso) {
    return '';
  }
  const minutes = Math.max(1, Math.round((SNAPSHOT_NOW - Date.parse(iso)) / 60_000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 35) {
    return `${Math.round(days / 7)}w ago`;
  }
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function clockTime(iso: string | undefined) {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

export function shortDate(iso: string | undefined) {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' });
}

/** 3401 → "56 min", 5083 → "1 hr 24 min". */
export function durationLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** 75 → "1:15", 3723 → "1:02:03". */
export function clock(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const padded = String(secs).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${padded}` : `${minutes}:${padded}`;
}

export function initials(first: string, last: string) {
  const lastWord = last.split(' ').pop() ?? last;
  return `${first[0] ?? ''}${lastWord[0] ?? ''}`.toUpperCase();
}

/** Shortest useful age: "23m", "3h", "2d", "3w", then a date. */
export function timeShort(iso: string | undefined) {
  if (!iso) {
    return '';
  }
  const minutes = Math.max(1, Math.round((SNAPSHOT_NOW - Date.parse(iso)) / 60_000));
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  if (days < 35) {
    return `${Math.round(days / 7)}w`;
  }
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
