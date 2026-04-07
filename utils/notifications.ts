import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { parseDateOnly } from './date';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('interview-reminder', {
            name: '面接リマインダー',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4F46E5',
        });
    }

    return true;
}

export async function scheduleInterviewNotification(
    companyId: string,
    companyName: string,
    interviewDate: string
): Promise<string | null> {
    try {
        await cancelNotificationForCompany(companyId);

        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return null;

        const parsedDate = parseDateOnly(interviewDate);
        if (!parsedDate) return null;

        const now = new Date();

        const eveTime = new Date(parsedDate);
        eveTime.setDate(eveTime.getDate() - 1);
        eveTime.setHours(21, 0, 0, 0);

        const morningTime = new Date(parsedDate);
        morningTime.setHours(7, 0, 0, 0);

        let scheduled: string | null = null;

        if (eveTime > now) {
            scheduled = await Notifications.scheduleNotificationAsync({
                identifier: `interview-eve-${companyId}`,
                content: {
                    title: '明日は面接日です',
                    body: `${companyName} の予定を確認して準備しましょう。`,
                    data: { companyId },
                    ...(Platform.OS === 'android' && { channelId: 'interview-reminder' }),
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: eveTime,
                },
            });
        }

        if (morningTime > now) {
            scheduled = await Notifications.scheduleNotificationAsync({
                identifier: `interview-morning-${companyId}`,
                content: {
                    title: '本日が面接日です',
                    body: `${companyName} の予定を確認してください。`,
                    data: { companyId },
                    ...(Platform.OS === 'android' && { channelId: 'interview-reminder' }),
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: morningTime,
                },
            });
        }

        return scheduled;
    } catch (error) {
        console.error('Failed to schedule notification:', error);
        return null;
    }
}

export async function cancelNotificationForCompany(companyId: string): Promise<void> {
    const ids = [
        `interview-eve-${companyId}`,
        `interview-morning-${companyId}`,
        `interview-${companyId}`,
    ];
    for (const id of ids) {
        try {
            await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
            // Ignore missing notifications.
        }
    }
}

export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

let recordingNotificationId: string | null = null;

export async function showRecordingNotification(): Promise<void> {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('recording', {
                name: '録音中',
                importance: Notifications.AndroidImportance.LOW,
                vibrationPattern: [],
                enableVibrate: false,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            });
        }

        recordingNotificationId = await Notifications.scheduleNotificationAsync({
            identifier: 'recording-active',
            content: {
                title: '録音中',
                body: 'アプリが音声を記録しています。',
                sticky: true,
                ...(Platform.OS === 'android' && { channelId: 'recording' }),
            },
            trigger: null,
        });
    } catch (error) {
        console.error('Failed to show recording notification:', error);
    }
}

export async function dismissRecordingNotification(): Promise<void> {
    try {
        if (!recordingNotificationId) return;
        await Notifications.dismissNotificationAsync(recordingNotificationId);
        recordingNotificationId = null;
    } catch {
        // Ignore missing notifications.
    }
}
