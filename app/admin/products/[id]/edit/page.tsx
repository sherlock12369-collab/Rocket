'use client';

import ProductForm from '@/components/ProductForm';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditProductPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
            router.push('/');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (id) {
            fetch(`/api/products/${id}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.error) {
                        alert('상품을 찾을 수 없습니다.');
                        router.push('/');
                    } else {
                        setInitialData(data);
                    }
                })
                .catch((err) => console.error(err));
        }
    }, [id, router]);

    if (status === 'loading' || !initialData) return <div className="text-center p-10">Loading...</div>;

    const handleUpdate = async (data: any) => {
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                alert('상품 수정에 실패했습니다.');
            }
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다.');
        }
    };

    return (
        <div className="p-4 py-10">
            <h1 className="text-2xl font-bold text-center mb-6 text-[var(--primary)]">상품 수정</h1>
            <ProductForm initialData={initialData} onSubmit={handleUpdate} isEdit />
        </div>
    );
}
