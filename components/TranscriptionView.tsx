import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import { formatDuration, startRecording, stopRecording } from '../utils/audioRecorder';
import { initWhisper, transcribeLocalAudio } from '../utils/whisperLocal';

interface TranscriptionViewProps {
    existingTranscription: string | null;
    onTranscriptionComplete: (text: string) => Promise<void> | void;
}

type ViewState = 'idle' | 'recording' | 'processing' | 'result';

export function TranscriptionView({
    existingTranscription,
    onTranscriptionComplete,
}: TranscriptionViewProps) {
    const [viewState, setViewState] = useState<ViewState>(existingTranscription ? 'result' : 'idle');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [displayText, setDisplayText] = useState(existingTranscription ?? '');
    const [progressText, setProgressText] = useState('');
    const [savedAudioUri, setSavedAudioUri] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const busyRef = useRef(false);

    useEffect(() => {
        setDisplayText(existingTranscription ?? '');
        setViewState(existingTranscription ? 'result' : 'idle');
        setIsDirty(false);
    }, [existingTranscription]);

    const saveButtonLabel = useMemo(() => {
        if (isSaving) return '保存中...';
        return isDirty ? '保存する' : '保存済み';
    }, [isDirty, isSaving]);

    async function handleStartRecording(): Promise<void> {
        if (busyRef.current) return;
        busyRef.current = true;
        try {
            await startRecording();
            setViewState('recording');
            setRecordingDuration(0);

            intervalRef.current = setInterval(() => {
                setRecordingDuration((current) => current + 1000);
            }, 1000);
        } catch (error) {
            const message = error instanceof Error ? error.message : '録音の開始に失敗しました';
            Alert.alert('エラー', message);
        } finally {
            busyRef.current = false;
        }
    }

    async function persistTranscription(text: string): Promise<void> {
        setIsSaving(true);
        try {
            await onTranscriptionComplete(text);
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to save transcription:', error);
            Alert.alert('エラー', '文字起こしの保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleStopRecording(): Promise<void> {
        if (busyRef.current) return;
        busyRef.current = true;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setViewState('processing');
        setProgressText('録音ファイルを保存しています...');

        try {
            const uri = await stopRecording();
            if (!uri) {
                Alert.alert('エラー', '録音ファイルが見つかりません');
                setViewState('idle');
                return;
            }

            setSavedAudioUri(uri);
            setProgressText('AIモデルを準備しています...');

            await initWhisper((progress) => {
                if (progress < 1) {
                    setProgressText(`AIモデルを読み込み中... ${Math.round(progress * 100)}%`);
                } else {
                    setProgressText('文字起こしを実行中...');
                }
            });

            const resultText = await transcribeLocalAudio(uri);
            setDisplayText(resultText);
            setViewState('result');
            setIsDirty(false);
            await persistTranscription(resultText);
        } catch (error) {
            console.error('Transcription error:', error);
            const message = error instanceof Error ? error.message : '文字起こしに失敗しました';
            Alert.alert('文字起こしエラー', message);
            setViewState('idle');
        } finally {
            busyRef.current = false;
        }
    }

    async function playAudio(): Promise<void> {
        if (!savedAudioUri) return;

        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync().catch(() => {});
                soundRef.current = null;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: savedAudioUri },
                { shouldPlay: true }
            );
            soundRef.current = sound;
            setIsPlaying(true);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                }
            });
        } catch (error) {
            console.error('Failed to play recording:', error);
            Alert.alert('再生エラー', '音声の再生に失敗しました');
            setIsPlaying(false);
        }
    }

    function handleReset(): void {
        Alert.alert(
            '確認',
            '文字起こし結果を破棄して、録音をやり直しますか？',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '破棄',
                    style: 'destructive',
                    onPress: () => {
                        setDisplayText('');
                        setViewState('idle');
                        setRecordingDuration(0);
                        setSavedAudioUri(null);
                        setIsDirty(false);
                        void persistTranscription('');
                    },
                },
            ]
        );
    }

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (soundRef.current) {
                void soundRef.current.unloadAsync();
            }
        };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>面接音声</Text>
                <Text style={styles.localBadge}>オフライン処理</Text>
            </View>

            {viewState === 'idle' ? (
                <View style={styles.idleContainer}>
                    <Text style={styles.description}>
                        面接の振り返りを録音し、端末内で文字起こしします。
                    </Text>
                    <TouchableOpacity style={styles.recordButton} onPress={() => void handleStartRecording()}>
                        <Text style={styles.recordIcon}>●</Text>
                        <Text style={styles.recordButtonText}>録音開始</Text>
                    </TouchableOpacity>
                    <Text style={styles.hintText}>
                        文字起こしはローカルで処理されます。
                    </Text>
                </View>
            ) : null}

            {viewState === 'recording' ? (
                <View style={styles.recordingContainer}>
                    <View style={styles.pulseContainer}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.recordingLabel}>録音中</Text>
                    </View>
                    <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
                    <TouchableOpacity style={styles.stopButton} onPress={() => void handleStopRecording()}>
                        <Text style={styles.stopIcon}>■</Text>
                        <Text style={styles.stopButtonText}>録音停止して文字起こし</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {viewState === 'processing' ? (
                <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.uploadingText}>AI 処理中</Text>
                    <Text style={styles.uploadingSubtext}>{progressText}</Text>
                </View>
            ) : null}

            {viewState === 'result' ? (
                <View style={styles.resultContainer}>
                    <View style={styles.transcriptionContainer}>
                        <View style={styles.transcriptionHeader}>
                            <Text style={styles.transcriptionLabel}>文字起こし結果</Text>
                            <TouchableOpacity
                                style={[styles.saveButton, (!isDirty || isSaving) && styles.saveButtonDisabled]}
                                onPress={() => void persistTranscription(displayText)}
                                disabled={!isDirty || isSaving}
                            >
                                <Text style={styles.saveButtonText}>{saveButtonLabel}</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.transcriptionInput}
                            multiline
                            value={displayText}
                            onChangeText={(text) => {
                                setDisplayText(text);
                                setIsDirty(text !== (existingTranscription ?? ''));
                            }}
                            placeholder="文字起こし結果がここに入ります"
                            textAlignVertical="top"
                            scrollEnabled={false}
                        />

                        <TouchableOpacity
                            style={styles.copyButton}
                            onPress={async () => {
                                await Clipboard.setStringAsync(displayText);
                                Alert.alert('コピーしました', '全文をクリップボードにコピーしました');
                            }}
                        >
                            <Text style={styles.copyButtonText}>全文をコピー</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionButtonsRow}>
                        {savedAudioUri ? (
                            <TouchableOpacity
                                style={[styles.secondaryButton, styles.playButton]}
                                onPress={() => void playAudio()}
                                disabled={isPlaying}
                            >
                                <Text style={[styles.secondaryButtonText, isPlaying && styles.secondaryButtonTextDisabled]}>
                                    {isPlaying ? '再生中...' : '録音を再生'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
                            <Text style={styles.secondaryButtonText}>やり直す</Text>
                        </TouchableOpacity>
                    </View>
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
        color: '#FFFFFF',
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
        color: '#FFFFFF',
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
    transcriptionContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        gap: 8,
    },
    transcriptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transcriptionLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    transcriptionInput: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
        minHeight: 120,
        maxHeight: 300,
        textAlignVertical: 'top',
        padding: 0,
    },
    copyButton: {
        alignSelf: 'flex-end',
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    copyButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    saveButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    saveButtonDisabled: {
        backgroundColor: '#C7D2FE',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    secondaryButton: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    playButton: {
        backgroundColor: '#E0F2FE',
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
    secondaryButtonTextDisabled: {
        color: '#9CA3AF',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 4,
    },
});
