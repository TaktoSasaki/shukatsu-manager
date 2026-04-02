import React, { useEffect, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface QRScannerModalProps {
    visible: boolean;
    onScan: (data: string) => void;
    onClose: () => void;
}

export function QRScannerModal({ visible, onScan, onClose }: QRScannerModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (visible) {
            setScanned(false);
        }
    }, [visible]);

    function handleBarcodeScanned({ data }: { data: string }): void {
        if (scanned) return;
        setScanned(true);
        onScan(data);
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>QRコードをスキャン</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>閉じる</Text>
                    </TouchableOpacity>
                </View>

                {!permission ? (
                    <View style={styles.centered}>
                        <Text style={styles.messageText}>カメラ権限を確認しています...</Text>
                    </View>
                ) : !permission.granted ? (
                    <View style={styles.centered}>
                        <Text style={styles.messageText}>
                            QRコードを読み取るにはカメラ権限が必要です。
                        </Text>
                        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                            <Text style={styles.permissionButtonText}>権限を許可する</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cameraWrapper}>
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

                        {scanned ? (
                            <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
                                <Text style={styles.rescanButtonText}>再スキャン</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}
            </View>
        </Modal>
    );
}

const FRAME_SIZE = 240;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#1F2937',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    closeButton: {
        fontSize: 16,
        fontWeight: '600',
        color: '#818CF8',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#111827',
    },
    messageText: {
        fontSize: 15,
        color: '#D1D5DB',
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
    cameraWrapper: {
        flex: 1,
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
        marginTop: 20,
        fontSize: 13,
        color: '#E5E7EB',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    rescanButton: {
        position: 'absolute',
        bottom: 48,
        alignSelf: 'center',
        backgroundColor: '#4F46E5',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
    },
    rescanButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
