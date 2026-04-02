import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#4F46E5',
    },
});
