import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { startRecording, stopRecording, formatDuration } from '../utils/audioRecorder';
import { transcribeLocalAudio, initWhisper } from '../utils/whisperLocal';

interface TranscriptionViewProps {
    companyId: string;
    existingTranscription: string | null;
    onTranscriptionComplete: (text: string) => void;
}

type ViewState = 'idle' | 'recording' | 'processing' | 'result';

export function TranscriptionView({
    companyId,
    existingTranscription,
    onTranscriptionComplete,
}: TranscriptionViewProps) {
    const [viewState, setViewState] = useState<ViewState>(
        existingTranscription ? 'result' : 'idle'
    );
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [displayText, setDisplayText] = useState(existingTranscription || '');
    const [progressText, setProgressText] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 既存データ反映
    useEffect(() => {
        if (existingTranscription) {
            setDisplayText(existingTranscription);
            setViewState('result');
        }
    }, [existingTranscription]);

    const handleStartRecording = async () => {
        try {
            await startRecording();
            setViewState('recording');
            setRecordingDuration(0);

            // タイマー開始
            intervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1000);
            }, 1000);
        } catch (error) {
            const msg = error instanceof Error ? error.message : '録音の開始に失敗しました';
            Alert.alert('エラー', msg);
        }
    };

    const handleStopRecording = async () => {
        // タイマー停止
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setViewState('processing');
        setProgressText('録音を保存しています...');

        try {
            const uri = await stopRecording();
            if (!uri) {
                Alert.alert('エラー', '録音ファイルが見つかりません');
                setViewState('idle');
                return;
            }

            // ローカルでWhisperを実行
            setProgressText('AIモデルの準備と文字起こしを実行中...\n（録音の長さにより数秒〜数十秒かかります）');

            // 初回はモデルのダウンロードがあるためプログレス表示用
            await initWhisper((progress) => {
                if (progress < 1) {
                    setProgressText(`モデルをダウンロード中... ${Math.round(progress * 100)}%`);
                } else {
                    setProgressText('文字起こし処理中...');
                }
            });

            const resultText = await transcribeLocalAudio(uri);

            setDisplayText(resultText);
            setViewState('result');

            // 親コンポーネントに通知（DBへの保存トリガー）
            onTranscriptionComplete(resultText);
        } catch (error) {
            console.error('Transcription error:', error);
            const msg = error instanceof Error ? error.message : '文字起こしに失敗しました';
            Alert.alert('文字起こしエラー', msg);
            setViewState('idle');
        }
    };

    const handleReset = () => {
        Alert.alert(
            '確認',
            '文字起こし結果を消去して、新しく録音しますか？',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '消去', style: 'destructive', onPress: () => {
                        setDisplayText('');
                        setViewState('idle');
                        setRecordingDuration(0);
                        onTranscriptionComplete('');
                    }
                },
            ]
        );
    };

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>面接録音（ローカル処理）</Text>
                <Text style={styles.localBadge}>オフライン対応</Text>
            </View>

            {/* 待機状態 */}
            {viewState === 'idle' && (
                <View style={styles.idleContainer}>
                    <Text style={styles.description}>
                        面接の様子を録音し、安全に端末内で{'\n'}文字起こしを実行します
                    </Text>
                    <TouchableOpacity
                        style={styles.recordButton}
                        onPress={handleStartRecording}
                    >
                        <Text style={styles.recordIcon}>🎙️</Text>
                        <Text style={styles.recordButtonText}>録音開始</Text>
                    </TouchableOpacity>
                    <Text style={styles.hintText}>
                        ※処理はすべてスマホ内で行われるため外部に音声は送信されません
                    </Text>
                </View>
            )}

            {/* 録音中 */}
            {viewState === 'recording' && (
                <View style={styles.recordingContainer}>
                    <View style={styles.pulseContainer}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.recordingLabel}>録音中</Text>
                    </View>
                    <Text style={styles.durationText}>
                        {formatDuration(recordingDuration)}
                    </Text>
                    <TouchableOpacity
                        style={styles.stopButton}
                        onPress={handleStopRecording}
                    >
                        <Text style={styles.stopIcon}>⏹️</Text>
                        <Text style={styles.stopButtonText}>録音完了（文字起こしへ）</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* AI処理中（ローカルWhisper） */}
            {viewState === 'processing' && (
                <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.uploadingText}>
                        AI 処理中
                    </Text>
                    <Text style={styles.uploadingSubtext}>
                        {progressText}
                    </Text>
                </View>
            )}

            {/* 結果表示 */}
            {viewState === 'result' && displayText ? (
                <View style={styles.resultContainer}>
                    <ScrollView style={styles.transcriptionScroll} nestedScrollEnabled>
                        <Text style={styles.transcriptionText}>
                            {displayText}
                        </Text>
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.reRecordButton}
                        onPress={handleReset}
                    >
                        <Text style={styles.reRecordButtonText}>🎙️ 録音し直す</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    localBadge: {
        fontSize: 11,
        color: '#2563EB',
        fontWeight: '600',
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    idleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    recordButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4F46E5',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 8,
    },
    recordIcon: {
        fontSize: 20,
    },
    recordButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    hintText: {
        marginTop: 12,
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    recordingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    pulseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    pulseDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
    },
    recordingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    durationText: {
        fontSize: 36,
        fontWeight: '200',
        color: '#1F2937',
        fontVariant: ['tabular-nums'],
        marginBottom: 24,
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 8,
    },
    stopIcon: {
        fontSize: 18,
    },
    stopButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    uploadingContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    uploadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#4F46E5',
    },
    uploadingSubtext: {
        marginTop: 12,
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    resultContainer: {
        gap: 12,
    },
    transcriptionScroll: {
        maxHeight: 300,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
    },
    transcriptionText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
    },
    reRecordButton: {
        alignSelf: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    reRecordButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
});
