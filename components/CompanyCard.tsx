import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Company } from '../types/company';
import { formatDisplayDate, getDaysRemaining } from '../utils/date';
import { StatusBadge } from './StatusBadge';

interface CompanyCardProps {
    company: Company;
}

export const CompanyCard = React.memo(function CompanyCard({ company }: CompanyCardProps) {
    const daysRemaining = getDaysRemaining(company.nextInterviewDate);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.companyName} numberOfLines={1}>
                    {company.companyName}
                </Text>
                <StatusBadge status={company.status} />
            </View>

            <View style={styles.details}>
                {company.position ? (
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>職種</Text>
                        <Text style={styles.value} numberOfLines={1}>{company.position}</Text>
                    </View>
                ) : null}

                {company.nextInterviewDate ? (
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>次回面接</Text>
                        <View style={styles.dateContainer}>
                            <Text style={styles.value}>{formatDisplayDate(company.nextInterviewDate)}</Text>
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
                ) : null}

                {company.entryDate ? (
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>エントリー</Text>
                        <Text style={styles.value}>{formatDisplayDate(company.entryDate)}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    companyName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        flex: 1,
        marginRight: 12,
    },
    details: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        color: '#6B7280',
        width: 80,
    },
    value: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    dateContainer: {
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
});
