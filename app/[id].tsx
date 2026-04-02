import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddEventModal } from '../components/AddEventModal';
import { CompanyForm } from '../components/CompanyForm';
import { SelectionTimeline } from '../components/SelectionTimeline';
import { StatusBadge } from '../components/StatusBadge';
import { TranscriptionView } from '../components/TranscriptionView';
import {
    createSelectionEvent,
    deleteCompany,
    deleteSelectionEvent,
    getCompanyById,
    getSelectionEventsByCompany,
    updateCompany,
    updateSelectionEvent,
} from '../database/repository';
import type { Company, CompanyInput, SelectionEvent, SelectionEventInput } from '../types/company';
import { formatDisplayDate, getDaysRemaining } from '../utils/date';

function normalizeNullable(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
}

export default function CompanyDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [company, setCompany] = useState<Company | null>(null);
    const [events, setEvents] = useState<SelectionEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<SelectionEvent | undefined>();
    const [isEditingId, setIsEditingId] = useState(false);
    const [tempLoginId, setTempLoginId] = useState('');

    const loadData = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        try {
            const [companyData, eventsData] = await Promise.all([
                getCompanyById(id),
                getSelectionEventsByCompany(id),
            ]);
            setCompany(companyData);
            setEvents(eventsData);
        } catch (error) {
            console.error('Failed to load company detail:', error);
            Alert.alert('エラー', '企業データの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            void loadData();
        }, [loadData])
    );

    async function handleSaveLoginId(): Promise<void> {
        if (!id || !company) return;

        try {
            const updated = await updateCompany(id, { loginId: normalizeNullable(tempLoginId) });
            if (updated) {
                setCompany(updated);
                setIsEditingId(false);
            }
        } catch (error) {
            console.error('Failed to update login ID:', error);
            Alert.alert('エラー', 'ログインIDの更新に失敗しました');
        }
    }

    async function handleUpdate(data: CompanyInput): Promise<void> {
        if (!id || !company) return;

        try {
            const updated = await updateCompany(id, data);
            if (updated) {
                setCompany(updated);
                setEditing(false);
            }
        } catch (error) {
            console.error('Failed to update company:', error);
            Alert.alert('エラー', '企業情報の更新に失敗しました');
        }
    }

    function handleDelete(): void {
        Alert.alert(
            '削除確認',
            `${company?.companyName ?? 'この企業'} を削除しますか？この操作は元に戻せません。`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除',
                    style: 'destructive',
                    onPress: async () => {
                        if (!id) return;
                        try {
                            await deleteCompany(id);
                            router.back();
                        } catch (error) {
                            console.error('Failed to delete company:', error);
                            Alert.alert('エラー', '企業の削除に失敗しました');
                        }
                    },
                },
            ]
        );
    }

    async function openMyPage(): Promise<void> {
        const url = company?.myPageUrl;
        if (!url) return;

        try {
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert('エラー', 'URLを開けませんでした');
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            console.error('Failed to open URL:', error);
            Alert.alert('エラー', 'URLを開けませんでした');
        }
    }

    async function handleAddEvent(input: SelectionEventInput): Promise<void> {
        try {
            await createSelectionEvent(input);
            await loadData();
        } catch (error) {
            console.error('Failed to add event:', error);
            Alert.alert('エラー', '選考イベントの追加に失敗しました');
        }
    }

    async function handleUpdateEvent(input: SelectionEventInput): Promise<void> {
        if (!editingEvent) return;

        try {
            await updateSelectionEvent(editingEvent.id, input);
            await loadData();
        } catch (error) {
            console.error('Failed to update event:', error);
            Alert.alert('エラー', '選考イベントの更新に失敗しました');
        }
    }

    async function handleDeleteEvent(): Promise<void> {
        if (!editingEvent) return;

        try {
            await deleteSelectionEvent(editingEvent.id);
            setEditingEvent(undefined);
            await loadData();
        } catch (error) {
            console.error('Failed to delete event:', error);
            Alert.alert('エラー', '選考イベントの削除に失敗しました');
        }
    }

    function handleCloseEventModal(): void {
        setShowEventModal(false);
        setEditingEvent(undefined);
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    if (!company) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>企業が見つかりません</Text>
            </View>
        );
    }

    if (editing) {
        return (
            <>
                <Stack.Screen options={{ title: '企業を編集' }} />
                <CompanyForm
                    initialData={company}
                    onSubmit={(data) => void handleUpdate(data)}
                    onCancel={() => setEditing(false)}
                />
            </>
        );
    }

    const daysRemaining = getDaysRemaining(company.nextInterviewDate);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen options={{ title: company.companyName }} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={styles.companyName}>{company.companyName}</Text>
                        <StatusBadge status={company.status} />
                    </View>

                    {company.myPageUrl ? (
                        <TouchableOpacity style={styles.myPageButton} onPress={() => void openMyPage()}>
                            <Text style={styles.myPageButtonText}>マイページを開く</Text>
                        </TouchableOpacity>
                    ) : null}

                    <View style={styles.loginIdContainer}>
                        {isEditingId ? (
                            <View style={styles.loginIdEditContainer}>
                                <TextInput
                                    style={styles.loginIdInput}
                                    value={tempLoginId}
                                    onChangeText={setTempLoginId}
                                    placeholder="ログインIDを入力"
                                    autoCapitalize="none"
                                />
                                <View style={styles.loginIdEditActions}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            setIsEditingId(false);
                                            setTempLoginId(company.loginId ?? '');
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>キャンセル</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveButton} onPress={() => void handleSaveLoginId()}>
                                        <Text style={styles.saveButtonText}>保存</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.loginIdLabel}>ログインID</Text>
                                    <Text style={styles.loginIdValue}>{company.loginId ?? '(未設定)'}</Text>
                                </View>
                                <View style={styles.loginIdActions}>
                                    {company.loginId ? (
                                        <TouchableOpacity
                                            style={styles.copyButton}
                                            onPress={async () => {
                                                await Clipboard.setStringAsync(company.loginId ?? '');
                                                Alert.alert('コピーしました', 'ログインIDをクリップボードにコピーしました');
                                            }}
                                        >
                                            <Text style={styles.copyButtonText}>コピー</Text>
                                        </TouchableOpacity>
                                    ) : null}

                                    <TouchableOpacity
                                        style={styles.editIdButton}
                                        onPress={() => {
                                            setTempLoginId(company.loginId ?? '');
                                            setIsEditingId(true);
                                        }}
                                    >
                                        <Text style={styles.editIdButtonText}>編集</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                <SelectionTimeline
                    events={events}
                    onEventPress={(event) => {
                        setEditingEvent(event);
                        setShowEventModal(true);
                    }}
                    onAddPress={() => setShowEventModal(true)}
                />

                <TranscriptionView
                    existingTranscription={company.transcription}
                    onTranscriptionComplete={async (text) => {
                        if (!id) return;
                        const updated = await updateCompany(id, { transcription: text || null });
                        if (updated) {
                            setCompany(updated);
                        }
                    }}
                />

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>基本情報</Text>
                    <DetailRow label="職種" value={company.position} />
                    <DetailRow label="エントリー日" value={formatDisplayDate(company.entryDate)} />

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>次回面接日</Text>
                        <View style={styles.detailValueContainer}>
                            <Text style={styles.detailValue}>{formatDisplayDate(company.nextInterviewDate)}</Text>
                            {daysRemaining !== null ? (
                                <Text
                                    style={[
                                        styles.daysRemaining,
                                        daysRemaining <= 3 && daysRemaining >= 0 ? styles.urgent : null,
                                        daysRemaining < 0 ? styles.passed : null,
                                    ]}
                                >
                                    {daysRemaining === 0
                                        ? '今日'
                                        : daysRemaining > 0
                                            ? `あと${daysRemaining}日`
                                            : `${Math.abs(daysRemaining)}日経過`}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </View>

                {company.esContent ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ES内容</Text>
                        <Text style={styles.longText}>{company.esContent}</Text>
                    </View>
                ) : null}

                {company.motivation ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>志望動機</Text>
                        <Text style={styles.longText}>{company.motivation}</Text>
                    </View>
                ) : null}

                {company.notes ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>メモ</Text>
                        <Text style={styles.longText}>{company.notes}</Text>
                    </View>
                ) : null}

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                        <Text style={styles.editButtonText}>編集する</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Text style={styles.deleteButtonText}>削除</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <AddEventModal
                visible={showEventModal}
                companyId={id ?? ''}
                initialEvent={editingEvent}
                onSubmit={editingEvent ? (input) => void handleUpdateEvent(input) : (input) => void handleAddEvent(input)}
                onDelete={editingEvent ? () => void handleDeleteEvent() : undefined}
                onClose={handleCloseEventModal}
            />
        </SafeAreaView>
    );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value || '-'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#6B7280',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
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
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    companyName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
        marginRight: 12,
    },
    myPageButton: {
        marginTop: 16,
        backgroundColor: '#EEF2FF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    myPageButtonText: {
        color: '#4F46E5',
        fontWeight: '600',
        fontSize: 15,
    },
    loginIdContainer: {
        marginTop: 12,
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 60,
    },
    loginIdEditContainer: {
        flex: 1,
        gap: 8,
    },
    loginIdInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    loginIdEditActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    loginIdActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    loginIdLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    loginIdValue: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '600',
    },
    copyButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    copyButtonText: {
        fontSize: 12,
        color: '#4F46E5',
        fontWeight: '600',
    },
    editIdButton: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    editIdButtonText: {
        fontSize: 12,
        color: '#4F46E5',
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    saveButtonText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    cancelButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    cancelButtonText: {
        fontSize: 12,
        color: '#6B7280',
    },
    section: {
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
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    detailLabel: {
        fontSize: 15,
        color: '#6B7280',
    },
    detailValue: {
        fontSize: 15,
        color: '#1F2937',
        fontWeight: '500',
    },
    detailValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    daysRemaining: {
        fontSize: 12,
        color: '#4F46E5',
        fontWeight: '600',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    urgent: {
        color: '#DC2626',
        backgroundColor: '#FEE2E2',
    },
    passed: {
        color: '#6B7280',
        backgroundColor: '#F3F4F6',
    },
    longText: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 24,
    },
    actions: {
        gap: 12,
        marginTop: 8,
    },
    editButton: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#FEE2E2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#DC2626',
        fontSize: 16,
        fontWeight: '600',
    },
});
