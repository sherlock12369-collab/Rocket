'use client';

import ProductForm from '@/components/ProductForm';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewProductPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
            router.push('/');
        }
    }, [status, session, router]);

    if (status === 'loading') return <div className="text-center p-10">Loading...</div>;

    const handleCreate = async (data: any) => {
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                alert('상품 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다.');
        }
    };

    return (
        <div className="p-4 py-10">
            <h1 className="text-2xl font-bold text-center mb-6 text-[var(--primary)]">새 상품 등록</h1>
            <ProductForm onSubmit={handleCreate} />
        </div>
    );
}
