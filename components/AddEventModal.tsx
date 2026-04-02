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
import { EVENT_RESULTS, EVENT_TYPES, RESULT_COLORS } from '../constants/status';
import type { SelectionEvent, SelectionEventInput } from '../types/company';
import { formatDisplayDate, parseDateOnly } from '../utils/date';

interface AddEventModalProps {
    visible: boolean;
    companyId: string;
    initialEvent?: SelectionEvent;
    onSubmit: (input: SelectionEventInput) => void;
    onDelete?: () => void;
    onClose: () => void;
}

function parsePickerDate(dateString: string): Date {
    return parseDateOnly(dateString) ?? new Date();
}

export function AddEventModal({
    visible,
    companyId,
    initialEvent,
    onSubmit,
    onDelete,
    onClose,
}: AddEventModalProps) {
    const [eventType, setEventType] = useState<SelectionEventInput['eventType']>(initialEvent?.eventType ?? EVENT_TYPES[0]);
    const [eventDate, setEventDate] = useState(initialEvent?.eventDate ?? '');
    const [result, setResult] = useState<SelectionEventInput['result']>(initialEvent?.result ?? EVENT_RESULTS[0]);
    const [notes, setNotes] = useState(initialEvent?.notes ?? '');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isEditing = Boolean(initialEvent);

    useEffect(() => {
        if (!initialEvent) return;
        setEventType(initialEvent.eventType);
        setEventDate(initialEvent.eventDate ?? '');
        setResult(initialEvent.result);
        setNotes(initialEvent.notes ?? '');
    }, [initialEvent]);

    useEffect(() => {
        if (visible && !initialEvent) {
            resetForm();
        }
    }, [visible, initialEvent]);

    function resetForm(): void {
        setEventType(EVENT_TYPES[0]);
        setEventDate('');
        setResult(EVENT_RESULTS[0]);
        setNotes('');
    }

    function handleSubmit(): void {
        onSubmit({
            companyId,
            eventType,
            eventDate: eventDate || null,
            result,
            notes: notes.trim() || null,
        });
        resetForm();
        onClose();
    }

    function handleDelete(): void {
        Alert.alert(
            '削除確認',
            'この選考イベントを削除しますか？',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除',
                    style: 'destructive',
                    onPress: () => {
                        onDelete?.();
                        onClose();
                    },
                },
            ]
        );
    }

    function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date): void {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate && event.type !== 'dismissed') {
            setEventDate(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`);
        }
    }

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{isEditing ? '選考イベントを編集' : '選考イベントを追加'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeButton}>閉じる</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.field}>
                            <Text style={styles.label}>イベント種別</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.chipContainer}>
                                    {EVENT_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.chip, eventType === type && styles.chipSelected]}
                                            onPress={() => setEventType(type)}
                                        >
                                            <Text style={[styles.chipText, eventType === type && styles.chipTextSelected]}>
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>実施日</Text>
                            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                                <Text style={[styles.dateButtonText, !eventDate && styles.dateButtonPlaceholder]}>
                                    {eventDate ? formatDisplayDate(eventDate) : '日付を選択'}
                                </Text>
                                {eventDate ? (
                                    <TouchableOpacity onPress={() => setEventDate('')}>
                                        <Text style={styles.clearButton}>×</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>結果</Text>
                            <View style={styles.resultContainer}>
                                {EVENT_RESULTS.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.resultButton, result === item && { backgroundColor: RESULT_COLORS[item] }]}
                                        onPress={() => setResult(item)}
                                    >
                                        <Text style={[styles.resultButtonText, result === item && styles.resultButtonTextSelected]}>
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>メモ</Text>
                            <TextInput
                                style={styles.notesInput}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="面接内容や振り返り"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        {isEditing ? (
                            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                <Text style={styles.deleteButtonText}>削除</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                            <Text style={styles.submitButtonText}>{isEditing ? '更新' : '追加'}</Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker ? (
                        <Modal
                            visible={showDatePicker}
                            transparent
                            animationType="slide"
                            onRequestClose={() => setShowDatePicker(false)}
                        >
                            <View style={styles.datePickerModal}>
                                <View style={styles.datePickerContainer}>
                                    <View style={styles.datePickerHeader}>
                                        <Text style={styles.datePickerTitle}>日付を選択</Text>
                                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                            <Text style={styles.datePickerDone}>完了</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={parsePickerDate(eventDate)}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateChange}
                                        locale="ja"
                                    />
                                </View>
                            </View>
                        </Modal>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeButton: {
        color: '#4F46E5',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    chipContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    chipSelected: {
        backgroundColor: '#4F46E5',
    },
    chipText: {
        color: '#374151',
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
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
        color: '#9CA3AF',
        fontSize: 16,
        padding: 4,
    },
    resultContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    resultButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    resultButtonText: {
        color: '#374151',
        fontWeight: '600',
    },
    resultButtonTextSelected: {
        color: '#FFFFFF',
    },
    notesInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        minHeight: 100,
        color: '#1F2937',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    deleteButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#DC2626',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 2,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
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
