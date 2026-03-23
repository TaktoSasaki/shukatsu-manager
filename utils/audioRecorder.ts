// 録音ユーティリティ
// expo-av を使ったWAV録音の開始/停止/管理
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

interface RecorderState {
    recording: Audio.Recording | null;
    uri: string | null;
    status: RecordingStatus;
    durationMs: number;
}

const initialState: RecorderState = {
    recording: null,
    uri: null,
    status: 'idle',
    durationMs: 0,
};

let state: RecorderState = { ...initialState };

// 録音設定（WAV形式、モノラル、16kHz）
const RECORDING_OPTIONS: Audio.RecordingOptions = {
    isMeteringEnabled: true,
    android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
    },
    ios: {
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    web: {
        mimeType: 'audio/wav',
        bitsPerSecond: 256000,
    },
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

    // オーディオモード設定
    await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
    });

    // 既存の録音をクリーンアップ
    if (state.recording) {
        try {
            await state.recording.stopAndUnloadAsync();
        } catch (e) {
            // 既に停止済みの場合は無視
        }
    }

    // 録音開始
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await recording.startAsync();
    state = {
        recording,
        uri: null,
        status: 'recording',
        durationMs: 0,
    };
}

// 録音停止
export async function stopRecording(): Promise<string | null> {
    if (!state.recording || state.status !== 'recording') {
        return null;
    }

    try {
        await state.recording.stopAndUnloadAsync();
        const uri = state.recording.getURI();

        // オーディオモードをリセット
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });

        state = {
            recording: null,
            uri: uri || null,
            status: 'stopped',
            durationMs: state.durationMs,
        };

        return uri || null;
    } catch (error) {
        console.error('Failed to stop recording:', error);
        state = { ...initialState };
        return null;
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
