import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanyCard } from '../../components/CompanyCard';
import { deleteCompany, getAllCompanies, reorderCompanies, type SortType } from '../../database/repository';
import type { Company } from '../../types/company';

const SORT_OPTIONS: Array<{ type: SortType; label: string }> = [
    { type: 'manual', label: '手動順' },
    { type: 'status-asc', label: 'ステータス昇順' },
    { type: 'status-desc', label: 'ステータス降順' },
    { type: 'interview', label: '面接日順' },
];

const keyExtractor = (item: Company) => item.id;

export default function HomeScreen() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortType, setSortType] = useState<SortType>('manual');
    const [showSortModal, setShowSortModal] = useState(false);
    const isFirstRender = useRef(true);
    const dataRef = useRef<Company[]>([]);
    const pendingDeleteRef = useRef<{ company: Company; index: number; timer: ReturnType<typeof setTimeout> } | null>(null);
    const [snackbar, setSnackbar] = useState<{ company: Company } | null>(null);
    const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

    const updateCompanies = useCallback((data: Company[]) => {
        dataRef.current = data;
        setCompanies(data);
    }, []);

    const loadCompanies = useCallback(async () => {
        try {
            updateCompanies(await getAllCompanies(sortType));
        } catch (error) {
            console.error('Failed to load companies:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sortType, updateCompanies]);

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

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCompanies();
    }, [loadCompanies]);

    const handleDragEnd = useCallback(({ data }: { data: Company[] }) => {
        // refだけ更新し、再レンダリングを発生させない
        // DraggableFlatListは内部的に正しい位置を保持している
        dataRef.current = data;

        reorderCompanies(data.map((company) => company.id))
            .then(() => {
                // DB書き込み完了後に状態を同期（アニメーション完了後なので安全）
                setCompanies(data);
            })
            .catch((error) => {
                console.error('Failed to reorder companies:', error);
                void loadCompanies();
            });
    }, [loadCompanies]);

    const handleDragBegin = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, []);

    const commitDelete = useCallback(async (company: Company) => {
        try {
            await deleteCompany(company.id);
        } catch (error) {
            console.error('Failed to delete company:', error);
        }
        pendingDeleteRef.current = null;
        setSnackbar(null);
    }, []);

    const handleSwipeDelete = useCallback((company: Company) => {
        // 前の保留削除があれば即確定
        if (pendingDeleteRef.current) {
            clearTimeout(pendingDeleteRef.current.timer);
            void commitDelete(pendingDeleteRef.current.company);
        }

        const currentData = dataRef.current;
        const index = currentData.findIndex((c) => c.id === company.id);
        const newData = currentData.filter((c) => c.id !== company.id);
        dataRef.current = newData;
        setCompanies(newData);
        setSnackbar({ company });

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const timer = setTimeout(() => {
            void commitDelete(company);
        }, 10000);

        pendingDeleteRef.current = { company, index, timer };
    }, [commitDelete]);

    const handleUndoDelete = useCallback(() => {
        const pending = pendingDeleteRef.current;
        if (!pending) return;

        clearTimeout(pending.timer);
        const currentData = [...dataRef.current];
        currentData.splice(pending.index, 0, pending.company);
        dataRef.current = currentData;
        setCompanies(currentData);

        pendingDeleteRef.current = null;
        setSnackbar(null);
    }, []);

    const renderRightActions = useCallback((_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const opacity = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <Animated.View style={[styles.deleteAction, { opacity }]}>
                <Text style={styles.deleteActionText}>削除</Text>
            </Animated.View>
        );
    }, []);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Company>) => (
        <Swipeable
            ref={(ref) => {
                if (ref) swipeableRefs.current.set(item.id, ref);
                else swipeableRefs.current.delete(item.id);
            }}
            renderRightActions={renderRightActions}
            onSwipeableOpen={(direction) => {
                if (direction === 'right') {
                    swipeableRefs.current.get(item.id)?.close();
                    handleSwipeDelete(item);
                }
            }}
            overshootRight={false}
            rightThreshold={80}
        >
            <TouchableOpacity
                onLongPress={sortType === 'manual' ? drag : undefined}
                onPress={() => router.push(`/${item.id}`)}
                disabled={isActive}
                activeOpacity={0.9}
                delayLongPress={200}
                style={{
                    opacity: isActive ? 0.9 : 1,
                    transform: [{ scale: isActive ? 1.02 : 1 }],
                    backgroundColor: '#F9FAFB',
                }}
            >
                <CompanyCard company={item} />
            </TouchableOpacity>
        </Swipeable>
    ), [router, sortType, renderRightActions, handleSwipeDelete]);

    const refreshControl = useMemo(() => (
        <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#4F46E5"
        />
    ), [refreshing, handleRefresh]);

    const listHeader = useMemo(() => (
        <View style={styles.header}>
            <Text style={styles.headerText}>{companies.length}社を管理中</Text>
            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
                <Text style={styles.sortButtonText}>並び替え</Text>
            </TouchableOpacity>
        </View>
    ), [companies.length]);

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
                    data={dataRef.current}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    onDragEnd={handleDragEnd}
                    onDragBegin={handleDragBegin}
                    contentContainerStyle={styles.list}
                    activationDistance={5}
                    autoscrollThreshold={100}
                    autoscrollSpeed={200}
                    dragItemOverflow={false}
                    containerStyle={styles.listContainer}
                    refreshControl={refreshControl}
                    ListHeaderComponent={listHeader}
                />
            )}

            {snackbar ? (
                <View style={styles.snackbar}>
                    <Text style={styles.snackbarText} numberOfLines={1}>
                        {snackbar.company.companyName} を削除しました
                    </Text>
                    <TouchableOpacity onPress={handleUndoDelete} style={styles.snackbarButton}>
                        <Text style={styles.snackbarButtonText}>元に戻す</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

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
    listContainer: {
        flex: 1,
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
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 24,
        marginVertical: 4,
        marginRight: 16,
        borderRadius: 12,
    },
    deleteActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    snackbar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 100,
        backgroundColor: '#1F2937',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    snackbarText: {
        color: '#FFFFFF',
        fontSize: 14,
        flex: 1,
        marginRight: 12,
    },
    snackbarButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    snackbarButtonText: {
        color: '#818CF8',
        fontSize: 14,
        fontWeight: '700',
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
