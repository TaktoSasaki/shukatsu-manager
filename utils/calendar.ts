import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

// 権限をリクエスト
export async function requestCalendarPermissions(): Promise<boolean> {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        return status === 'granted';
    } catch (e) {
        console.error('Calendar permission request failed:', e);
        return false;
    }
}

// 書き込み可能なデフォルトカレンダーのIDを取得
// Android: プライマリ or Googleカレンダー優先
// iOS: デフォルトカレンダー
async function getDefaultCalendarId(): Promise<string | null> {
    try {
        if (Platform.OS === 'ios') {
            const defaultCal = await Calendar.getDefaultCalendarAsync();
            return defaultCal?.id ?? null;
        }

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const writable = calendars.filter(c => c.allowsModifications);

        // プライマリカレンダーを優先
        const primary = writable.find(c => (c as any).isPrimary);
        if (primary) return primary.id;

        // Googleカレンダーを次点に
        const google = writable.find(c => c.source?.type === 'com.google');
        if (google) return google.id;

        return writable[0]?.id ?? null;
    } catch (e) {
        console.error('Failed to get calendar:', e);
        return null;
    }
}

// 面接イベントを新規作成し、eventId を返す（失敗時は null）
export async function createCalendarEvent(
    companyName: string,
    interviewDate: string // YYYY-MM-DD
): Promise<string | null> {
    try {
        const granted = await requestCalendarPermissions();
        if (!granted) return null;

        const calendarId = await getDefaultCalendarId();
        if (!calendarId) return null;

        const parts = interviewDate.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return null;
        const [year, month, day] = parts;

        const eventId = await Calendar.createEventAsync(calendarId, {
            title: `${companyName} 面接`,
            startDate: new Date(year, month - 1, day, 9, 0, 0),
            endDate: new Date(year, month - 1, day, 18, 0, 0),
            notes: '就活管理アプリより自動作成',
            alarms: [{ relativeOffset: -60 }], // 1時間前アラーム
        });

        return eventId;
    } catch (e) {
        console.error('Failed to create calendar event:', e);
        return null;
    }
}

// 既存イベントを更新する。イベントが削除済みの場合は再作成して新しいIDを返す
export async function updateCalendarEvent(
    eventId: string | null,
    companyName: string,
    interviewDate: string
): Promise<string | null> {
    // eventId がなければ新規作成
    if (!eventId) {
        return createCalendarEvent(companyName, interviewDate);
    }

    try {
        const granted = await requestCalendarPermissions();
        if (!granted) return eventId;

        const parts = interviewDate.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return eventId;
        const [year, month, day] = parts;

        await Calendar.updateEventAsync(eventId, {
            title: `${companyName} 面接`,
            startDate: new Date(year, month - 1, day, 9, 0, 0),
            endDate: new Date(year, month - 1, day, 18, 0, 0),
        });

        return eventId;
    } catch (e) {
        // イベントがカレンダー側で削除されていた場合は再作成
        console.warn('Calendar event not found, recreating:', e);
        return createCalendarEvent(companyName, interviewDate);
    }
}

// イベントを削除（存在しない場合は無視）
export async function deleteCalendarEvent(eventId: string): Promise<void> {
    try {
        await Calendar.deleteEventAsync(eventId);
    } catch (e) {
        // 既にカレンダーから削除済みの場合は無視
    }
}
