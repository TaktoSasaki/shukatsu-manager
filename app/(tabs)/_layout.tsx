import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#4F46E5',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '700',
                },
                tabBarActiveTintColor: '#4F46E5',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    borderTopColor: '#E5E7EB',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: '就活管理',
                    tabBarLabel: '企業一覧',
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>🏢</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'カレンダー',
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>📅</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="qr-scan"
                options={{
                    title: 'QRスキャン',
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>📷</Text>
                    ),
                }}
            />
        </Tabs>
    );
}
