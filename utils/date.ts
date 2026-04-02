// Date utilities

export function parseDateOnly(date: string | null): Date | null {
    if (!date) return null;
    const parts = date.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
}

export function compareDateOnly(a: string | null, b: string | null): number {
    const aDate = parseDateOnly(a);
    const bDate = parseDateOnly(b);

    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.getTime() - bDate.getTime();
}

export function formatDate(date: Date | string | null): string | null {
    if (!date) return null;
    const parsed = typeof date === 'string' ? parseDateOnly(date) ?? new Date(date) : date;
    if (Number.isNaN(parsed.getTime())) return null;

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date: string | null): string {
    if (!date) return '-';
    const parsed = parseDateOnly(date);
    if (!parsed) return '-';

    return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(2, '0')}`;
}

export function formatDisplayDateTime(date: string | null): string {
    if (!date) return '-';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '-';

    const dateStr = `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
    return `${dateStr} ${timeStr}`;
}

export function extractTimeFromDateTime(date: string | null): string | null {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

export function getDaysRemaining(date: string | null): number | null {
    const target = parseDateOnly(date);
    if (!target) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getCurrentISOString(): string {
    return new Date().toISOString();
}
