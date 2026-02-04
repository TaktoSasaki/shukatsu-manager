import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requestNotificationPermissions } from '../utils/notifications';

export default function RootLayout() {
    useEffect(() => {
        // アプリ起動時に通知権限をリクエスト
        requestNotificationPermissions();
    }, []);

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: '#4F46E5',
                        },
                        headerTintColor: '#FFFFFF',
                        headerTitleStyle: {
                            fontWeight: '700',
                        },
                        contentStyle: {
                            backgroundColor: '#F9FAFB',
                        },
                    }}
                >
                    <Stack.Screen
                        name="index"
                        options={{
                            title: '就活管理',
                        }}
                    />
                    <Stack.Screen
                        name="add"
                        options={{
                            title: '企業を追加',
                            presentation: 'modal',
                        }}
                    />
                    <Stack.Screen
                        name="[id]"
                        options={{
                            title: '企業詳細',
                        }}
                    />
                </Stack>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#4F46E5',
    },
});
