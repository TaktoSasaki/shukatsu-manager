import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS, DEFAULT_CUSTOM_STATUS_COLOR } from '../constants/status';

interface StatusBadgeProps {
    status: string;
    customColor?: string;
}

export function StatusBadge({ status, customColor }: StatusBadgeProps) {
    const backgroundColor = customColor || STATUS_COLORS[status] || DEFAULT_CUSTOM_STATUS_COLOR;

    return (
        <View style={[styles.badge, { backgroundColor }]}>
            <Text style={styles.text}>{status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
