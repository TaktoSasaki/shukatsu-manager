import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SelectionEvent } from '../types/company';
import { formatDisplayDate } from '../utils/date';
import { RESULT_COLORS } from '../constants/status';

interface SelectionTimelineProps {
    events: SelectionEvent[];
    onEventPress?: (event: SelectionEvent) => void;
    onAddPress: () => void;
}

export function SelectionTimeline({ events, onEventPress, onAddPress }: SelectionTimelineProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>選考履歴</Text>
                <TouchableOpacity onPress={onAddPress} style={styles.addButton}>
                    <Text style={styles.addButtonText}>+ 追加</Text>
                </TouchableOpacity>
            </View>

            {events.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>選考履歴がありません</Text>
                    <Text style={styles.emptySubtext}>「+ 追加」から選考を記録しましょう</Text>
                </View>
            ) : (
                <View style={styles.timeline}>
                    {events.map((event, index) => (
                        <TouchableOpacity
                            key={event.id}
                            style={styles.eventItem}
                            onPress={() => onEventPress?.(event)}
                            activeOpacity={0.7}
                        >
                            {/* タイムラインライン */}
                            <View style={styles.timelineLeft}>
                                <View style={[
                                    styles.dot,
                                    { backgroundColor: RESULT_COLORS[event.result] || '#6B7280' }
                                ]} />
                                {index < events.length - 1 && <View style={styles.line} />}
                            </View>

                            {/* イベント内容 */}
                            <View style={styles.eventContent}>
                                <View style={styles.eventHeader}>
                                    <Text style={styles.eventType}>{event.eventType}</Text>
                                    <View style={[
                                        styles.resultBadge,
                                        { backgroundColor: RESULT_COLORS[event.result] || '#6B7280' }
                                    ]}>
                                        <Text style={styles.resultText}>{event.result}</Text>
                                    </View>
                                </View>
                                {event.eventDate && (
                                    <Text style={styles.eventDate}>
                                        {formatDisplayDate(event.eventDate)}
                                    </Text>
                                )}
                                {event.notes && (
                                    <Text style={styles.eventNotes} numberOfLines={2}>
                                        {event.notes}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
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
    addButton: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#4F46E5',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyText: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    timeline: {
        paddingLeft: 4,
    },
    eventItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineLeft: {
        alignItems: 'center',
        marginRight: 12,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 4,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: '#E5E7EB',
        marginTop: 4,
        minHeight: 30,
    },
    eventContent: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    eventType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    resultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    resultText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    eventDate: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
    eventNotes: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
    },
});
