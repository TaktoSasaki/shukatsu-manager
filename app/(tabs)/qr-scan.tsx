import React, { useCallback, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScanRecord {
    id: number;
    data: string;
    scannedAt: Date;
}

let nextId = 1;

export default function QRScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
    const [cameraActive, setCameraActive] = useState(false);

    useFocusEffect(
        useCallback(() => {
            setCameraActive(true);
            setScanned(false);
            return () => setCameraActive(false);
        }, [])
    );

    function handleBarcodeScanned({ data }: { data: string }): void {
        if (scanned) return;
        setScanned(true);

        const record: ScanRecord = {
            id: nextId++,
            data,
            scannedAt: new Date(),
        };
        setScanRecords((prev) => [record, ...prev]);

        const isUrl = /^https?:\/\//i.test(data);
        Alert.alert(
            'QRコードを読み取りました',
            data,
            isUrl
                ? [
                      { text: '閉じる', style: 'cancel', onPress: () => setScanned(false) },
                      {
                          text: 'URLを開く',
                          onPress: async () => {
                              try {
                                  await Linking.openURL(data);
                              } catch {
                                  Alert.alert('エラー', 'URLを開けませんでした');
                              }
                              setScanned(false);
                          },
                      },
                  ]
                : [{ text: 'OK', onPress: () => setScanned(false) }],
        );
    }

    function handleClearHistory(): void {
        Alert.alert('履歴をクリア', 'スキャン履歴をすべて削除しますか？', [
            { text: 'キャンセル', style: 'cancel' },
            { text: '削除', style: 'destructive', onPress: () => setScanRecords([]) },
        ]);
    }

    if (!permission) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={styles.centered}>
                    <Text style={styles.messageText}>カメラ権限を確認しています...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={styles.centered}>
                    <Text style={styles.messageText}>
                        QRコードを読み取るにはカメラ権限が必要です。
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>権限を許可する</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.cameraSection}>
                {cameraActive ? (
                    <CameraView
                        style={styles.camera}
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.scanFrame} />
                            <Text style={styles.hint}>
                                QRコードを枠内に合わせてください
                            </Text>
                        </View>
                    </CameraView>
                ) : null}
            </View>

            <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>スキャン履歴</Text>
                    {scanRecords.length > 0 ? (
                        <TouchableOpacity onPress={handleClearHistory}>
                            <Text style={styles.clearButton}>クリア</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {scanRecords.length === 0 ? (
                    <Text style={styles.emptyText}>まだスキャン履歴がありません</Text>
                ) : (
                    <ScrollView style={styles.historyList}>
                        {scanRecords.map((record) => (
                            <TouchableOpacity
                                key={record.id}
                                style={styles.historyItem}
                                onPress={async () => {
                                    if (/^https?:\/\//i.test(record.data)) {
                                        try {
                                            await Linking.openURL(record.data);
                                        } catch {
                                            Alert.alert('エラー', 'URLを開けませんでした');
                                        }
                                    }
                                }}
                            >
                                <Text style={styles.historyData} numberOfLines={2}>
                                    {record.data}
                                </Text>
                                <Text style={styles.historyTime}>
                                    {record.scannedAt.toLocaleTimeString('ja-JP')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}

const FRAME_SIZE = 200;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    messageText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cameraSection: {
        height: 280,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#818CF8',
        backgroundColor: 'transparent',
        shadowColor: '#818CF8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    hint: {
        marginTop: 16,
        fontSize: 13,
        color: '#E5E7EB',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    historySection: {
        flex: 1,
        padding: 16,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    clearButton: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 32,
    },
    historyList: {
        flex: 1,
    },
    historyItem: {
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    historyData: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    historyTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
});
