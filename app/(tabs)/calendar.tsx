import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBadge } from '../../components/StatusBadge';
import { getAllCompanies } from '../../database/repository';
import type { Company } from '../../types/company';
import { parseDateOnly } from '../../utils/date';

interface DayEntry {
    date: string;
    companies: Company[];
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function getMonthDays(year: number, month: number): Date[] {
    const days: Date[] = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CalendarScreen() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            void getAllCompanies('interview').then(setCompanies).catch(() => {});
        }, [])
    );

    const interviewMap = new Map<string, Company[]>();
    for (const company of companies) {
        if (company.nextInterviewDate) {
            const key = company.nextInterviewDate;
            const list = interviewMap.get(key) ?? [];
            list.push(company);
            interviewMap.set(key, list);
        }
    }

    const days = getMonthDays(currentYear, currentMonth);
    const firstDayOfWeek = days[0].getDay();
    const todayKey = toDateKey(new Date());

    function goToPrevMonth(): void {
        if (currentMonth === 0) {
            setCurrentYear(currentYear - 1);
            setCurrentMonth(11);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
        setSelectedDate(null);
    }

    function goToNextMonth(): void {
        if (currentMonth === 11) {
            setCurrentYear(currentYear + 1);
            setCurrentMonth(0);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
        setSelectedDate(null);
    }

    const selectedCompanies = selectedDate ? (interviewMap.get(selectedDate) ?? []) : [];

    const upcomingEntries: DayEntry[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sortedKeys = [...interviewMap.keys()].sort();
    for (const key of sortedKeys) {
        const parsed = parseDateOnly(key);
        if (parsed && parsed >= now) {
            upcomingEntries.push({ date: key, companies: interviewMap.get(key)! });
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView>
                <View style={styles.monthHeader}>
                    <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                        <Text style={styles.navButtonText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>
                        {currentYear}年{currentMonth + 1}月
                    </Text>
                    <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                        <Text style={styles.navButtonText}>▶</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.weekdayRow}>
                    {WEEKDAY_LABELS.map((label, i) => (
                        <View key={label} style={styles.weekdayCell}>
                            <Text style={[
                                styles.weekdayText,
                                i === 0 && styles.sundayText,
                                i === 6 && styles.saturdayText,
                            ]}>{label}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.calendarGrid}>
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <View key={`empty-${i}`} style={styles.dayCell} />
                    ))}
                    {days.map((day) => {
                        const key = toDateKey(day);
                        const hasInterview = interviewMap.has(key);
                        const isToday = key === todayKey;
                        const isSelected = key === selectedDate;
                        const dayOfWeek = day.getDay();

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.dayCell,
                                    isToday && styles.todayCell,
                                    isSelected && styles.selectedCell,
                                ]}
                                onPress={() => setSelectedDate(isSelected ? null : key)}
                                activeOpacity={0.6}
                            >
                                <Text style={[
                                    styles.dayText,
                                    isToday && styles.todayText,
                                    isSelected && styles.selectedDayText,
                                    dayOfWeek === 0 && styles.sundayText,
                                    dayOfWeek === 6 && styles.saturdayText,
                                ]}>
                                    {day.getDate()}
                                </Text>
                                {hasInterview ? (
                                    <View style={styles.dot} />
                                ) : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {selectedDate && selectedCompanies.length > 0 ? (
                    <View style={styles.selectedSection}>
                        <Text style={styles.sectionTitle}>
                            {selectedDate.replace(/-/g, '/')} の予定
                        </Text>
                        {selectedCompanies.map((company) => (
                            <TouchableOpacity
                                key={company.id}
                                style={styles.companyItem}
                                onPress={() => router.push(`/${company.id}`)}
                            >
                                <Text style={styles.companyName}>{company.companyName}</Text>
                                <StatusBadge status={company.status} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : null}

                <View style={styles.upcomingSection}>
                    <Text style={styles.sectionTitle}>今後の面接予定</Text>
                    {upcomingEntries.length === 0 ? (
                        <Text style={styles.emptyText}>予定されている面接はありません</Text>
                    ) : (
                        upcomingEntries.map((entry) => (
                            <View key={entry.date} style={styles.upcomingDay}>
                                <Text style={styles.upcomingDate}>
                                    {entry.date.replace(/-/g, '/')}
                                </Text>
                                {entry.companies.map((company) => (
                                    <TouchableOpacity
                                        key={company.id}
                                        style={styles.companyItem}
                                        onPress={() => router.push(`/${company.id}`)}
                                    >
                                        <Text style={styles.companyName}>{company.companyName}</Text>
                                        <StatusBadge status={company.status} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    navButton: {
        padding: 8,
    },
    navButtonText: {
        fontSize: 16,
        color: '#4F46E5',
        fontWeight: '600',
    },
    weekdayRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
    },
    weekdayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekdayText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    sundayText: {
        color: '#EF4444',
    },
    saturdayText: {
        color: '#3B82F6',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
    },
    dayCell: {
        width: '14.28%',
        alignItems: 'center',
        paddingVertical: 8,
        minHeight: 48,
    },
    todayCell: {
        backgroundColor: '#EEF2FF',
        borderRadius: 8,
    },
    selectedCell: {
        backgroundColor: '#4F46E5',
        borderRadius: 8,
    },
    dayText: {
        fontSize: 15,
        color: '#374151',
    },
    todayText: {
        fontWeight: '700',
        color: '#4F46E5',
    },
    selectedDayText: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4F46E5',
        marginTop: 4,
    },
    selectedSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    upcomingSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 24,
    },
    upcomingDay: {
        marginBottom: 16,
    },
    upcomingDate: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    companyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    companyName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
});
