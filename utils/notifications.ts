// 通知ユーティリティ
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 通知の表示設定
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// 通知権限をリクエスト
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

    // Androidの場合、通知チャンネルを設定
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

// 面接日の朝7時に通知をスケジュール
export async function scheduleInterviewNotification(
    companyId: string,
    companyName: string,
    interviewDateTime: string
): Promise<string | null> {
    try {
        // 既存の通知をキャンセル
        await cancelNotificationForCompany(companyId);

        // YYYY-MM-DD形式をローカル時刻として解析（new Date('YYYY-MM-DD')はUTC解釈でズレる）
        const parts = interviewDateTime.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            return null;
        }
        const interviewDate = new Date(parts[0], parts[1] - 1, parts[2]);

        // 面接当日の朝7時に設定
        const notificationTime = new Date(interviewDate);
        notificationTime.setHours(7, 0, 0, 0);

        // 既に通知時刻を過ぎている場合はスケジュールしない
        if (notificationTime <= new Date()) {
            return null;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '📅 本日面接があります',
                body: `${companyName}の面接が予定されています`,
                data: { companyId },
                ...(Platform.OS === 'android' && { channelId: 'interview-reminder' }),
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: notificationTime,
            },
            identifier: `interview-${companyId}`,
        });

        return notificationId;
    } catch (error) {
        console.error('Failed to schedule notification:', error);
        return null;
    }
}

// 企業の通知をキャンセル
export async function cancelNotificationForCompany(companyId: string): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(`interview-${companyId}`);
    } catch (error) {
        // 通知が存在しない場合はエラーを無視
    }
}

// 全ての予定された通知をキャンセル
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// 録音中の通知ID（バックグラウンド録音中に表示する常駐通知）
let recordingNotificationId: string | null = null;

// 録音開始時に常駐通知を表示（Androidのバックグラウンド処理継続を支援）
export async function showRecordingNotification(): Promise<void> {
    try {
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
                title: '🎙️ 録音中',
                body: '就活管理アプリが面接を録音しています。停止するにはアプリを開いてください。',
                sticky: true,
                ...(Platform.OS === 'android' && { channelId: 'recording' }),
            },
            trigger: null,
        });
    } catch (e) {
        console.error('Failed to show recording notification:', e);
    }
}

// 録音停止時に常駐通知を消す
export async function dismissRecordingNotification(): Promise<void> {
    try {
        if (recordingNotificationId) {
            await Notifications.dismissNotificationAsync(recordingNotificationId);
            recordingNotificationId = null;
        }
    } catch (e) {
        // 通知がすでに消えていた場合は無視
    }
}
