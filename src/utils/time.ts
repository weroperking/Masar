/**
 * Time formatting utilities for Masar (مسار)
 * Provides 12-hour Arabic format across the entire platform.
 */

/**
 * Converts a 24-hour time string (e.g. "14:30", "09:00", "00:15") into a 12-hour format (e.g. "02:30 م", "09:00 ص", "12:15 ص").
 */
export function formatTime12(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const parts = trimmed.split(':');
  if (parts.length < 2) return timeStr;

  const hours24 = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');

  if (isNaN(hours24)) return timeStr;

  const period = hours24 >= 12 ? 'م' : 'ص';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const formattedHours = String(hours12).padStart(2, '0');

  return `${formattedHours}:${minutes} ${period}`;
}

/**
 * Formats a start and end time into a 12-hour range string (e.g. "02:30 م - 04:00 م").
 */
export function formatTimeRange12(startTime?: string | null, endTime?: string | null): string {
  if (!startTime && !endTime) return '-';
  if (startTime && !endTime) return formatTime12(startTime);
  if (!startTime && endTime) return formatTime12(endTime);
  return `${formatTime12(startTime)} - ${formatTime12(endTime)}`;
}

/**
 * Formats a Date, ISO string, or numeric timestamp to a 12-hour time string (e.g. "02:30 م").
 */
export function formatTimestamp12(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const hours24 = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const period = hours24 >= 12 ? 'م' : 'ص';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const formattedHours = String(hours12).padStart(2, '0');
    return `${formattedHours}:${minutes} ${period}`;
  } catch {
    return '-';
  }
}
