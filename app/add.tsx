import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CompanyForm } from '../components/CompanyForm';
import { createCompany } from '../database/repository';
import { CompanyInput } from '../types/company';

export default function AddCompanyScreen() {
    const router = useRouter();

    const handleSubmit = async (data: CompanyInput) => {
        try {
            await createCompany(data);
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : '企業の登録に失敗しました';
            Alert.alert('エラー', message);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <CompanyForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
        />
    );
}
