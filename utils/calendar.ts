import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { parseDateOnly } from './date';

export async function requestCalendarPermissions(): Promise<boolean> {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Calendar permission request failed:', error);
        return false;
    }
}

async function getDefaultCalendarId(): Promise<string | null> {
    try {
        if (Platform.OS === 'ios') {
            const calendar = await Calendar.getDefaultCalendarAsync();
            return calendar?.id ?? null;
        }

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const writable = calendars.filter((calendar) => calendar.allowsModifications);
        const primary = writable.find((calendar) => (calendar as { isPrimary?: boolean }).isPrimary);
        if (primary) return primary.id;

        const google = writable.find((calendar) => calendar.source?.type === 'com.google');
        if (google) return google.id;

        return writable[0]?.id ?? null;
    } catch (error) {
        console.error('Failed to get calendar:', error);
        return null;
    }
}

function buildAllDayRange(interviewDate: string): { startDate: Date; endDate: Date } | null {
    const startDate = parseDateOnly(interviewDate);
    if (!startDate) return null;

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    return { startDate, endDate };
}

export async function createCalendarEvent(
    companyName: string,
    interviewDate: string
): Promise<string | null> {
    try {
        const granted = await requestCalendarPermissions();
        if (!granted) return null;

        const calendarId = await getDefaultCalendarId();
        if (!calendarId) return null;

        const range = buildAllDayRange(interviewDate);
        if (!range) return null;

        return await Calendar.createEventAsync(calendarId, {
            title: `${companyName} 面接`,
            startDate: range.startDate,
            endDate: range.endDate,
            allDay: true,
            notes: '就活アプリから作成された予定です。',
            alarms: [{ relativeOffset: -60 }],
        });
    } catch (error) {
        console.error('Failed to create calendar event:', error);
        return null;
    }
}

export async function updateCalendarEvent(
    eventId: string | null,
    companyName: string,
    interviewDate: string
): Promise<string | null> {
    if (!eventId) {
        return createCalendarEvent(companyName, interviewDate);
    }

    try {
        const granted = await requestCalendarPermissions();
        if (!granted) return eventId;

        const range = buildAllDayRange(interviewDate);
        if (!range) return eventId;

        await Calendar.updateEventAsync(eventId, {
            title: `${companyName} 面接`,
            startDate: range.startDate,
            endDate: range.endDate,
            allDay: true,
        });
        return eventId;
    } catch (error) {
        console.warn('Calendar event not found, recreating:', error);
        return createCalendarEvent(companyName, interviewDate);
    }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
    try {
        await Calendar.deleteEventAsync(eventId);
    } catch {
        // Ignore missing events.
    }
}
