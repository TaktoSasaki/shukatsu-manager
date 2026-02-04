import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert,
    Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Company, CompanyInput } from '../types/company';
import { DEFAULT_STATUS_LIST } from '../constants/status';
import { getAllCustomStatuses, addCustomStatus, CustomStatus } from '../database/repository';
import { StatusBadge } from './StatusBadge';
import { formatDisplayDate } from '../utils/date';

interface CompanyFormProps {
    initialData?: Company;
    onSubmit: (data: CompanyInput) => void;
    onCancel: () => void;
}

export function CompanyForm({ initialData, onSubmit, onCancel }: CompanyFormProps) {
    const [companyName, setCompanyName] = useState(initialData?.companyName || '');
    const [loginId, setLoginId] = useState(initialData?.loginId || '');
    const [myPageUrl, setMyPageUrl] = useState(initialData?.myPageUrl || '');
    const [entryDate, setEntryDate] = useState(initialData?.entryDate || '');
    const [nextInterviewDate, setNextInterviewDate] = useState(initialData?.nextInterviewDate || '');
    const [position, setPosition] = useState(initialData?.position || '');
    const [esContent, setEsContent] = useState(initialData?.esContent || '');
    const [motivation, setMotivation] = useState(initialData?.motivation || '');
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [status, setStatus] = useState(initialData?.status || '未エントリー');

    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
    const [newStatusName, setNewStatusName] = useState('');
    const [showAddStatus, setShowAddStatus] = useState(false);

    // Date picker states
    const [showEntryDatePicker, setShowEntryDatePicker] = useState(false);
    const [showInterviewDatePicker, setShowInterviewDatePicker] = useState(false);

    useEffect(() => {
        loadCustomStatuses();
    }, []);

    const loadCustomStatuses = async () => {
        const statuses = await getAllCustomStatuses();
        setCustomStatuses(statuses);
    };

    const handleAddCustomStatus = async () => {
        if (!newStatusName.trim()) return;
        try {
            await addCustomStatus(newStatusName.trim(), '#6366F1');
            await loadCustomStatuses();
            setNewStatusName('');
            setShowAddStatus(false);
        } catch (error) {
            Alert.alert('エラー', 'ステータスの追加に失敗しました');
        }
    };

    const handleSubmit = () => {
        if (!companyName.trim()) {
            Alert.alert('エラー', '企業名を入力してください');
            return;
        }

        onSubmit({
            companyName: companyName.trim(),
            loginId: loginId.trim() || null,
            myPageUrl: myPageUrl.trim() || null,
            entryDate: entryDate || null,
            nextInterviewDate: nextInterviewDate || null,
            position: position.trim() || null,
            esContent: esContent.trim() || null,
            motivation: motivation.trim() || null,
            notes: notes.trim() || null,
            status,
        });
    };

    const allStatuses = [
        ...DEFAULT_STATUS_LIST,
        ...customStatuses.map(s => s.name),
    ];

    const handleEntryDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowEntryDatePicker(Platform.OS === 'ios');
        if (selectedDate && event.type !== 'dismissed') {
            const dateString = selectedDate.toISOString().split('T')[0];
            setEntryDate(dateString);
        }
        if (Platform.OS === 'android') {
            setShowEntryDatePicker(false);
        }
    };

    const handleInterviewDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowInterviewDatePicker(Platform.OS === 'ios');
        if (selectedDate && event.type !== 'dismissed') {
            // ISO8601形式で日時を保存
            setNextInterviewDate(selectedDate.toISOString());
        }
        if (Platform.OS === 'android') {
            setShowInterviewDatePicker(false);
        }
    };

    const parseDate = (dateString: string): Date => {
        if (dateString) {
            const parsed = new Date(dateString);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return new Date();
    };

    const clearEntryDate = () => {
        setEntryDate('');
    };

    const clearInterviewDate = () => {
        setNextInterviewDate('');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.field}>
                <Text style={styles.label}>企業名 *</Text>
                <TextInput
                    style={styles.input}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="株式会社○○"
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>選考状況</Text>
                <TouchableOpacity
                    style={styles.statusButton}
                    onPress={() => setShowStatusPicker(true)}
                >
                    <StatusBadge status={status} />
                    <Text style={styles.statusButtonText}>変更</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>マイページID</Text>
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
                <TextInput
                    style={styles.input}
                    value={myPageUrl}
                    onChangeText={setMyPageUrl}
                    placeholder="https://..."
                    placeholderTextColor="#9CA3AF"
                    keyboardType="url"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.field, styles.halfField]}>
                    <Text style={styles.label}>エントリー日</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowEntryDatePicker(true)}
                    >
                        <Text style={[
                            styles.dateButtonText,
                            !entryDate && styles.dateButtonPlaceholder
                        ]}>
                            {entryDate ? formatDisplayDate(entryDate) : '📅 選択'}
                        </Text>
                        {entryDate && (
                            <TouchableOpacity onPress={clearEntryDate} style={styles.clearButton}>
                                <Text style={styles.clearButtonText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={[styles.field, styles.halfField]}>
                    <Text style={styles.label}>次回面接日</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowInterviewDatePicker(true)}
                    >
                        <Text style={[
                            styles.dateButtonText,
                            !nextInterviewDate && styles.dateButtonPlaceholder
                        ]}>
                            {nextInterviewDate ? formatDisplayDate(nextInterviewDate) : '📅 選択'}
                        </Text>
                        {nextInterviewDate && (
                            <TouchableOpacity onPress={clearInterviewDate} style={styles.clearButton}>
                                <Text style={styles.clearButtonText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Date Pickers */}
            {
                showEntryDatePicker && (
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
                                    value={parseDate(entryDate)}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleEntryDateChange}
                                    locale="ja"
                                />
                            </View>
                        </View>
                    </Modal>
                )
            }

            {
                showInterviewDatePicker && (
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
                                    value={parseDate(nextInterviewDate)}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleInterviewDateChange}
                                    locale="ja"
                                />
                            </View>
                        </View>
                    </Modal>
                )
            }

            <View style={styles.field}>
                <Text style={styles.label}>応募職種</Text>
                <TextInput
                    style={styles.input}
                    value={position}
                    onChangeText={setPosition}
                    placeholder="エンジニア、営業など"
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>使用したES</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={esContent}
                    onChangeText={setEsContent}
                    placeholder="ESの内容・概要"
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
                    placeholder="志望動機・面接で話した内容"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>その他メモ</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="面接官の印象、質問内容など"
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
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>
                        {initialData ? '更新する' : '登録する'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ステータス選択モーダル */}
            <Modal
                visible={showStatusPicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowStatusPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>選考状況を選択</Text>
                            <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                                <Text style={styles.modalClose}>閉じる</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.statusList}>
                            {allStatuses.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.statusOption,
                                        status === s && styles.statusOptionSelected,
                                    ]}
                                    onPress={() => {
                                        setStatus(s);
                                        setShowStatusPicker(false);
                                    }}
                                >
                                    <StatusBadge status={s} />
                                    {status === s && <Text style={styles.checkmark}>✓</Text>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* カスタムステータス追加 */}
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
                                    <TouchableOpacity
                                        style={styles.addStatusConfirm}
                                        onPress={handleAddCustomStatus}
                                    >
                                        <Text style={styles.addStatusConfirmText}>追加</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addStatusButton}
                                    onPress={() => setShowAddStatus(true)}
                                >
                                    <Text style={styles.addStatusButtonText}>
                                        + カスタムステータスを追加
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView >
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
    // Modal styles
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
    // Date picker styles
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

