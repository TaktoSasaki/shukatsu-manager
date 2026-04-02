// 録音ユーティリティ
// react-native-audio-record を使った純粋なWAV/PCM録音の管理
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
// @ts-ignore
import AudioRecord from 'react-native-audio-record';
// @ts-ignore
import BackgroundService from 'react-native-background-actions';
import { showRecordingNotification, dismissRecordingNotification } from './notifications';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

interface RecorderState {
    uri: string | null;
    status: RecordingStatus;
    durationMs: number;
}

const initialState: RecorderState = {
    uri: null,
    status: 'idle',
    durationMs: 0,
};

let state: RecorderState = { ...initialState };
let isInitialized = false;

// Android フォアグラウンドサービスのタスクを終了させるリゾルバ
let backgroundTaskResolver: (() => void) | null = null;

// フォアグラウンドサービスとして動作し続ける空タスク（Android 専用）
// resolve が呼ばれるまでサービスを維持する
const backgroundRecordingTask = async (_taskData: unknown) => {
    await new Promise<void>((resolve) => {
        backgroundTaskResolver = resolve;
    });
};

// マイク権限をリクエスト
export async function requestAudioPermission(): Promise<boolean> {
    const permission = await Audio.requestPermissionsAsync();
    return permission.granted;
}

// 録音開始
export async function startRecording(): Promise<void> {
    // 権限チェック
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
        throw new Error('マイクの使用が許可されていません');
    }

    try {
        if (Platform.OS === 'android') {
            // Android: react-native-background-actions でフォアグラウンドサービスを起動。
            // これにより画面オフ・他アプリ切り替え時でも OS にプロセスを強制終了されない。
            await BackgroundService.start(backgroundRecordingTask, {
                taskName: '面接録音',
                taskTitle: '🎙️ 録音中',
                taskDesc: '就活管理アプリが面接を録音しています。停止するにはアプリを開いてください。',
                taskIcon: { name: 'ic_launcher', type: 'mipmap' },
                color: '#4F46E5',
                linkingURI: 'shukatsu://',
            });
        } else {
            // iOS: UIBackgroundModes: ["audio"] + staysActiveInBackground で対応。
            // 録音中のみバックグラウンド・画面オフで動作し、停止時に解除する。
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
            });
            await showRecordingNotification();
        }

        // ネイティブ録音の初期化と開始
        if (!isInitialized) {
            AudioRecord.init({
                sampleRate: 16000,
                channels: 1,
                bitsPerSample: 16,
                audioSource: 6, // VOICE_RECOGNITION
                wavFile: 'shukatsu_interview.wav',
            });
            isInitialized = true;
        }

        AudioRecord.start();
        state = {
            uri: null,
            status: 'recording',
            durationMs: 0,
        };
    } catch (e) {
        console.error('Failed to start recording:', e);
        // 起動に失敗した場合はフォアグラウンドサービスをクリーンアップ
        if (Platform.OS === 'android' && BackgroundService.isRunning()) {
            backgroundTaskResolver?.();
            backgroundTaskResolver = null;
            await BackgroundService.stop();
        }
        throw new Error('録音の初期化に失敗しました');
    }
}

// 録音停止
export async function stopRecording(): Promise<string | null> {
    if (state.status !== 'recording') {
        return null;
    }

    try {
        const filePath = await AudioRecord.stop();

        // 再生やWhisperのためにfile://プレフィックスを付ける
        let finalUri = filePath;
        if (finalUri && !finalUri.startsWith('file://') && finalUri.startsWith('/')) {
            finalUri = 'file://' + finalUri;
        }

        state = {
            uri: finalUri || null,
            status: 'stopped',
            durationMs: state.durationMs,
        };

        return finalUri || null;
    } catch (error) {
        console.error('Failed to stop recording:', error);
        state = { ...initialState };
        return null;
    } finally {
        // 録音停止後は必ずバックグラウンドサービス・オーディオセッションを解除
        if (Platform.OS === 'android') {
            if (BackgroundService.isRunning()) {
                backgroundTaskResolver?.();
                backgroundTaskResolver = null;
                await BackgroundService.stop();
            }
        } else {
            await dismissRecordingNotification();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: false,
            });
        }
    }
}

// 録音状態を取得
export function getRecordingStatus(): RecorderState {
    return { ...state };
}

// 録音をリセット
export function resetRecording(): void {
    state = { ...initialState };
}

// 録音時間のフォーマット (mm:ss)
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
