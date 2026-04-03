import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DEFAULT_CUSTOM_STATUS_COLOR, DEFAULT_STATUS, DEFAULT_STATUS_LIST } from '../constants/status';
import { addCustomStatus, CustomStatus, getAllCustomStatuses } from '../database/repository';
import { type Company, type CompanyInput } from '../types/company';
import { formatDisplayDate, parseDateOnly } from '../utils/date';
import { QRScannerModal } from './QRScannerModal';
import { StatusBadge } from './StatusBadge';

interface CompanyFormProps {
    initialData?: Company;
    onSubmit: (data: CompanyInput) => Promise<void> | void;
    onCancel: () => void;
}

function parsePickerDate(dateString: string): Date {
    return parseDateOnly(dateString) ?? new Date();
}

function normalizeNullable(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
}

export function CompanyForm({ initialData, onSubmit, onCancel }: CompanyFormProps) {
    const [companyName, setCompanyName] = useState(initialData?.companyName ?? '');
    const [loginId, setLoginId] = useState(initialData?.loginId ?? '');
    const [myPageUrl, setMyPageUrl] = useState(initialData?.myPageUrl ?? '');
    const [entryDate, setEntryDate] = useState(initialData?.entryDate ?? '');
    const [nextInterviewDate, setNextInterviewDate] = useState(initialData?.nextInterviewDate ?? '');
    const [position, setPosition] = useState(initialData?.position ?? '');
    const [esContent, setEsContent] = useState(initialData?.esContent ?? '');
    const [motivation, setMotivation] = useState(initialData?.motivation ?? '');
    const [notes, setNotes] = useState(initialData?.notes ?? '');
    const [status, setStatus] = useState(initialData?.status ?? DEFAULT_STATUS);

    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
    const [newStatusName, setNewStatusName] = useState('');
    const [showAddStatus, setShowAddStatus] = useState(false);
    const [showEntryDatePicker, setShowEntryDatePicker] = useState(false);
    const [showInterviewDatePicker, setShowInterviewDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        void loadCustomStatuses();
    }, []);

    async function loadCustomStatuses(): Promise<void> {
        try {
            setCustomStatuses(await getAllCustomStatuses());
        } catch (error) {
            console.error('Failed to load custom statuses:', error);
            Alert.alert('エラー', 'カスタムステータスの読み込みに失敗しました');
        }
    }

    async function handleAddCustomStatus(): Promise<void> {
        const trimmed = newStatusName.trim();
        if (!trimmed) return;

        try {
            await addCustomStatus(trimmed, DEFAULT_CUSTOM_STATUS_COLOR);
            await loadCustomStatuses();
            setNewStatusName('');
            setShowAddStatus(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'カスタムステータスの追加に失敗しました';
            Alert.alert('エラー', message);
        }
    }

    function validateUrl(url: string | null): boolean {
        if (!url) return true;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    async function handleSubmit(): Promise<void> {
        if (isSubmitting) return;

        const trimmedCompanyName = companyName.trim();
        if (!trimmedCompanyName) {
            Alert.alert('エラー', '企業名を入力してください');
            return;
        }

        const normalizedUrl = normalizeNullable(myPageUrl);
        if (!validateUrl(normalizedUrl)) {
            Alert.alert('エラー', 'マイページURLは http:// または https:// で始まる形式で入力してください');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                companyName: trimmedCompanyName,
                loginId: normalizeNullable(loginId),
                myPageUrl: normalizedUrl,
                entryDate: entryDate || null,
                nextInterviewDate: nextInterviewDate || null,
                position: normalizeNullable(position),
                esContent: normalizeNullable(esContent),
                motivation: normalizeNullable(motivation),
                notes: normalizeNullable(notes),
                transcription: initialData?.transcription ?? null,
                status,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleEntryDateChange(event: DateTimePickerEvent, selectedDate?: Date): void {
        setShowEntryDatePicker(Platform.OS === 'ios');
        if (selectedDate && event.type !== 'dismissed') {
            setEntryDate(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`);
        }
        if (Platform.OS === 'android') {
            setShowEntryDatePicker(false);
        }
    }

    function handleInterviewDateChange(event: DateTimePickerEvent, selectedDate?: Date): void {
        setShowInterviewDatePicker(Platform.OS === 'ios');
        if (selectedDate && event.type !== 'dismissed') {
            setNextInterviewDate(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`);
        }
        if (Platform.OS === 'android') {
            setShowInterviewDatePicker(false);
        }
    }

    const allStatuses = [...DEFAULT_STATUS_LIST, ...customStatuses.map((item) => item.name)];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.field}>
                <Text style={styles.label}>企業名 *</Text>
                <TextInput
                    style={styles.input}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="例: OpenAI"
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>ステータス</Text>
                <TouchableOpacity style={styles.statusButton} onPress={() => setShowStatusPicker(true)}>
                    <StatusBadge status={status} />
                    <Text style={styles.statusButtonText}>変更</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>ログインID</Text>
                <TextInput
                    style={styles.input}
                    value={loginId}
                    onChangeText={setLoginId}
                    placeholder="ログインID"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>マイページURL</Text>
                <View style={styles.urlRow}>
                    <TextInput
                        style={[styles.input, styles.urlInput]}
                        value={myPageUrl}
                        onChangeText={setMyPageUrl}
                        placeholder="https://..."
                        placeholderTextColor="#9CA3AF"
                        keyboardType="url"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.qrButton} onPress={() => setShowQRScanner(true)}>
                        <Text style={styles.qrButtonText}>QR</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <QRScannerModal
                visible={showQRScanner}
                onScan={(data) => {
                    setMyPageUrl(data);
                    setShowQRScanner(false);
                }}
                onClose={() => setShowQRScanner(false)}
            />

            <View style={styles.row}>
                <View style={[styles.field, styles.halfField]}>
                    <Text style={styles.label}>エントリー日</Text>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowEntryDatePicker(true)}>
                        <Text style={[styles.dateButtonText, !entryDate && styles.dateButtonPlaceholder]}>
                            {entryDate ? formatDisplayDate(entryDate) : '日付を選択'}
                        </Text>
                        {entryDate ? (
                            <TouchableOpacity onPress={() => setEntryDate('')} style={styles.clearButton}>
                                <Text style={styles.clearButtonText}>×</Text>
                            </TouchableOpacity>
                        ) : null}
                    </TouchableOpacity>
                </View>

                <View style={[styles.field, styles.halfField]}>
                    <Text style={styles.label}>次回面接日</Text>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowInterviewDatePicker(true)}>
                        <Text style={[styles.dateButtonText, !nextInterviewDate && styles.dateButtonPlaceholder]}>
                            {nextInterviewDate ? formatDisplayDate(nextInterviewDate) : '日付を選択'}
                        </Text>
                        {nextInterviewDate ? (
                            <TouchableOpacity onPress={() => setNextInterviewDate('')} style={styles.clearButton}>
                                <Text style={styles.clearButtonText}>×</Text>
                            </TouchableOpacity>
                        ) : null}
                    </TouchableOpacity>
                </View>
            </View>

            {showEntryDatePicker ? (
                <Modal
                    visible={showEntryDatePicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowEntryDatePicker(false)}
                >
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>エントリー日を選択</Text>
                                <TouchableOpacity onPress={() => setShowEntryDatePicker(false)}>
                                    <Text style={styles.datePickerDone}>完了</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={parsePickerDate(entryDate)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleEntryDateChange}
                                locale="ja"
                            />
                        </View>
                    </View>
                </Modal>
            ) : null}

            {showInterviewDatePicker ? (
                <Modal
                    visible={showInterviewDatePicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowInterviewDatePicker(false)}
                >
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>次回面接日を選択</Text>
                                <TouchableOpacity onPress={() => setShowInterviewDatePicker(false)}>
                                    <Text style={styles.datePickerDone}>完了</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={parsePickerDate(nextInterviewDate)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleInterviewDateChange}
                                locale="ja"
                            />
                        </View>
                    </View>
                </Modal>
            ) : null}

            <View style={styles.field}>
                <Text style={styles.label}>職種</Text>
                <TextInput
                    style={styles.input}
                    value={position}
                    onChangeText={setPosition}
                    placeholder="エンジニア、営業 など"
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>ES内容</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={esContent}
                    onChangeText={setEsContent}
                    placeholder="ESの内容や提出文面"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>志望動機</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={motivation}
                    onChangeText={setMotivation}
                    placeholder="志望動機や面接で話した内容"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>メモ</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="面接対策、連絡事項など"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.buttons}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={() => void handleSubmit()}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>{isSubmitting ? '処理中...' : initialData ? '更新する' : '登録する'}</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={showStatusPicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowStatusPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>ステータスを選択</Text>
                            <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                                <Text style={styles.modalClose}>閉じる</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.statusList}>
                            {allStatuses.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.statusOption, status === item && styles.statusOptionSelected]}
                                    onPress={() => {
                                        setStatus(item);
                                        setShowStatusPicker(false);
                                    }}
                                >
                                    <StatusBadge status={item} />
                                    {status === item ? <Text style={styles.checkmark}>✓</Text> : null}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.addStatusSection}>
                            {showAddStatus ? (
                                <View style={styles.addStatusForm}>
                                    <TextInput
                                        style={styles.addStatusInput}
                                        value={newStatusName}
                                        onChangeText={setNewStatusName}
                                        placeholder="新しいステータス名"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                    <TouchableOpacity style={styles.addStatusConfirm} onPress={() => void handleAddCustomStatus()}>
                                        <Text style={styles.addStatusConfirmText}>追加</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.addStatusButton} onPress={() => setShowAddStatus(true)}>
                                    <Text style={styles.addStatusButtonText}>+ カスタムステータスを追加</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    field: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1F2937',
    },
    multiline: {
        minHeight: 100,
        paddingTop: 14,
    },
    urlRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    urlInput: {
        flex: 1,
    },
    qrButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
    statusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
    },
    statusButtonText: {
        color: '#4F46E5',
        fontWeight: '600',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
    },
    dateButtonText: {
        fontSize: 16,
        color: '#1F2937',
    },
    dateButtonPlaceholder: {
        color: '#9CA3AF',
    },
    clearButton: {
        padding: 4,
    },
    clearButtonText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 1,
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    modalClose: {
        color: '#4F46E5',
        fontSize: 16,
        fontWeight: '600',
    },
    statusList: {
        padding: 16,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    statusOptionSelected: {
        backgroundColor: '#EEF2FF',
    },
    checkmark: {
        color: '#4F46E5',
        fontSize: 18,
        fontWeight: '700',
    },
    addStatusSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    addStatusButton: {
        padding: 12,
        alignItems: 'center',
    },
    addStatusButtonText: {
        color: '#4F46E5',
        fontSize: 16,
        fontWeight: '600',
    },
    addStatusForm: {
        flexDirection: 'row',
        gap: 12,
    },
    addStatusInput: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    addStatusConfirm: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 20,
        borderRadius: 8,
        justifyContent: 'center',
    },
    addStatusConfirmText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    datePickerModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    datePickerDone: {
        color: '#4F46E5',
        fontSize: 16,
        fontWeight: '600',
    },
});
