'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await signIn('credentials', {
                username,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('아이디 또는 비밀번호가 일치하지 않습니다.');
                return;
            }

            router.push('/');
            router.refresh();
        } catch (err) {
            console.log(err);
            setError('로그인 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md card">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-[var(--primary)] mb-2">Rocket 🚀</h1>
                    <p className="text-[var(--text-secondary)]">가족 전용 쇼핑몰에 오신 것을 환영합니다!</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">아이디</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-black"
                            placeholder="아이디를 입력하세요"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-black"
                            placeholder="비밀번호를 입력하세요"
                            required
                        />
                    </div>

                    {error && <p className="text-[var(--error)] text-sm">{error}</p>}

                    <button
                        type="submit"
                        className="w-full btn-primary py-3 text-lg shadow-lg hover:shadow-xl transform transition-all"
                    >
                        로그인
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-[var(--text-secondary)]">
                    계정이 없으신가요? <Link href="/auth/register" className="text-[var(--primary)] font-bold hover:underline">회원가입</Link>
                </div>
            </div>
        </div>
    );
}
