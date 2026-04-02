import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanyCard } from '../components/CompanyCard';
import { getAllCompanies, reorderCompanies, type SortType } from '../database/repository';
import type { Company } from '../types/company';

const SORT_OPTIONS: Array<{ type: SortType; label: string }> = [
    { type: 'manual', label: '手動順' },
    { type: 'status-asc', label: 'ステータス昇順' },
    { type: 'status-desc', label: 'ステータス降順' },
    { type: 'interview', label: '面接日順' },
];

export default function HomeScreen() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortType, setSortType] = useState<SortType>('manual');
    const [showSortModal, setShowSortModal] = useState(false);
    const isFirstRender = useRef(true);

    const loadCompanies = useCallback(async () => {
        try {
            setCompanies(await getAllCompanies(sortType));
        } catch (error) {
            console.error('Failed to load companies:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sortType]);

    useFocusEffect(
        useCallback(() => {
            void loadCompanies();
        }, [loadCompanies])
    );

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        void loadCompanies();
    }, [loadCompanies]);

    async function handleRefresh(): Promise<void> {
        setRefreshing(true);
        await loadCompanies();
    }

    async function handleDragEnd({ data }: { data: Company[] }): Promise<void> {
        const previousData = companies;
        setCompanies(data);

        try {
            await reorderCompanies(data.map((company) => company.id));
        } catch (error) {
            console.error('Failed to reorder companies:', error);
            setCompanies(previousData);
        }
    }

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Company>) => (
        <TouchableOpacity
            onLongPress={sortType === 'manual' ? drag : undefined}
            onPress={() => router.push(`/${item.id}`)}
            disabled={isActive}
            activeOpacity={0.9}
            delayLongPress={200}
            style={{
                opacity: isActive ? 0.9 : 1,
                transform: [{ scale: isActive ? 1.02 : 1 }],
            }}
        >
            <CompanyCard company={item} />
        </TouchableOpacity>
    ), [router, sortType]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {companies.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🏢</Text>
                    <Text style={styles.emptyTitle}>まだ企業が登録されていません</Text>
                    <Text style={styles.emptySubtitle}>
                        右下のボタンから企業を追加してください。
                    </Text>
                </View>
            ) : (
                <DraggableFlatList
                    data={companies}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    onDragEnd={handleDragEnd}
                    onDragBegin={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    contentContainerStyle={styles.list}
                    activationDistance={5}
                    autoscrollThreshold={100}
                    autoscrollSpeed={200}
                    dragItemOverflow={false}
                    containerStyle={{ flex: 1 }}
                    refreshControl={(
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => void handleRefresh()}
                            tintColor="#4F46E5"
                        />
                    )}
                    ListHeaderComponent={(
                        <View style={styles.header}>
                            <Text style={styles.headerText}>{companies.length}社を管理中</Text>
                            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
                                <Text style={styles.sortButtonText}>並び替え</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/add')} activeOpacity={0.8}>
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>

            <Modal
                visible={showSortModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowSortModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>並び替え</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)}>
                                <Text style={styles.modalClose}>閉じる</Text>
                            </TouchableOpacity>
                        </View>

                        {SORT_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.type}
                                style={[styles.sortOption, sortType === option.type && styles.sortOptionSelected]}
                                onPress={() => {
                                    setSortType(option.type);
                                    setShowSortModal(false);
                                }}
                            >
                                <Text style={[styles.sortOptionText, sortType === option.type && styles.sortOptionTextSelected]}>
                                    {option.label}
                                </Text>
                                {sortType === option.type ? <Text style={styles.checkmark}>✓</Text> : null}
                            </TouchableOpacity>
                        ))}

                        {sortType === 'manual' ? (
                            <Text style={styles.sortHint}>カードを長押しすると手動で並び替えできます。</Text>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
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
        backgroundColor: '#F9FAFB',
    },
    list: {
        paddingVertical: 8,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    sortButton: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    sortButtonText: {
        color: '#4F46E5',
        fontWeight: '600',
        fontSize: 13,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabIcon: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '300',
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
        paddingBottom: 30,
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
    sortOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sortOptionSelected: {
        backgroundColor: '#EEF2FF',
    },
    sortOptionText: {
        fontSize: 16,
        color: '#374151',
    },
    sortOptionTextSelected: {
        color: '#4F46E5',
        fontWeight: '600',
    },
    checkmark: {
        color: '#4F46E5',
        fontSize: 18,
        fontWeight: '700',
    },
    sortHint: {
        padding: 16,
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
    },
});
