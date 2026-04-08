import { Audio } from 'expo-av';
import { Platform } from 'react-native';
// @ts-ignore
import AudioRecord from 'react-native-audio-record';
// @ts-ignore
import BackgroundService from 'react-native-background-actions';
import { dismissRecordingNotification, showRecordingNotification } from './notifications';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

interface RecorderState {
    uri: string | null;
    status: RecordingStatus;
}

const initialState: RecorderState = {
    uri: null,
    status: 'idle',
};

let state: RecorderState = { ...initialState };
let backgroundTaskResolver: (() => void) | null = null;

const backgroundRecordingTask = async (_taskData: unknown) => {
    await new Promise<void>((resolve) => {
        backgroundTaskResolver = resolve;
    });
};

export async function requestAudioPermission(): Promise<boolean> {
    const permission = await Audio.requestPermissionsAsync();
    return permission.granted;
}

export async function startRecording(): Promise<void> {
    if (state.status === 'recording') {
        return;
    }

    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
        throw new Error('マイクの使用が許可されていません');
    }

    try {
        if (Platform.OS === 'android') {
            await BackgroundService.start(backgroundRecordingTask, {
                taskName: '面接録音',
                taskTitle: '録音中',
                taskDesc: 'アプリが音声を記録しています。',
                taskIcon: { name: 'ic_launcher', type: 'mipmap' },
                color: '#4F46E5',
                linkingURI: 'shukatsu://',
            });
        } else {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
            });
            await showRecordingNotification().catch(() => {});
        }

        AudioRecord.init({
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            audioSource: 6,
            wavFile: 'shukatsu_interview.wav',
        });

        AudioRecord.start();
        state = {
            uri: null,
            status: 'recording',
        };
    } catch (error) {
        console.error('Failed to start recording:', error);

        if (Platform.OS === 'android' && BackgroundService.isRunning()) {
            backgroundTaskResolver?.();
            backgroundTaskResolver = null;
            await BackgroundService.stop();
        }

        throw new Error('録音の開始に失敗しました');
    }
}

export async function stopRecording(): Promise<string | null> {
    if (state.status !== 'recording') {
        return null;
    }

    try {
        const filePath = await AudioRecord.stop();
        const uri = filePath && !filePath.startsWith('file://') && filePath.startsWith('/')
            ? `file://${filePath}`
            : filePath;

        state = {
            uri: uri || null,
            status: 'stopped',
        };

        return uri || null;
    } catch (error) {
        console.error('Failed to stop recording:', error);
        state = { ...initialState };
        return null;
    } finally {
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

export function getRecordingStatus(): RecorderState {
    return { ...state };
}

export function resetRecording(): void {
    state = { ...initialState };
}

export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
