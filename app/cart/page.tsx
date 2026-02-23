'use client';

import { useCart } from '@/context/CartContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, clearCart, totalPrice, cartCount } = useCart();
    const { data: session } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // 배송비 로직: 기본 2포인트, 15포인트 이상 구매 시 무료
    const shippingFee = totalPrice >= 15 || cartCount === 0 ? 0 : 2;
    const finalPrice = totalPrice + shippingFee;

    const handleOrder = async () => {
        if (!session) {
            alert('로그인이 필요합니다.');
            router.push('/auth/login');
            return;
        }

        if (cart.length === 0) return;

        setLoading(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    shippingFee,
                    totalPrice: finalPrice,
                }),
            });

            if (res.ok) {
                alert('주문이 완료되었습니다! 🚀');
                clearCart();
                router.push('/profile');
            } else {
                const error = await res.json();
                alert(error.error || '주문 실패');
            }
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-gradient uppercase tracking-tighter">보급창고 🛒</h1>
                <Link href="/" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                    ← 탐사 계속하기
                </Link>
            </div>

            {cart.length === 0 ? (
                <div className="glass-card py-20 text-center">
                    <span className="text-6xl mb-6 block opacity-20">📦</span>
                    <p className="text-slate-400 font-medium mb-8">장바구니가 비어 있습니다.</p>
                    <Link href="/" className="btn-rocket">
                        아이템 둘러보기
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {cart.map((item) => (
                            <div key={item.productId} className="glass-card p-4 flex gap-4 items-center group">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-base group-hover:text-[var(--accent)] transition-colors">{item.title}</h3>
                                        <button
                                            onClick={() => removeFromCart(item.productId)}
                                            className="text-slate-500 hover:text-red-500 transition-colors p-1"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                className="px-3 py-1 hover:bg-white/10 text-slate-400 hover:text-white transition-colors font-bold"
                                            >-</button>
                                            <span className="px-3 text-sm font-black w-10 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                className="px-3 py-1 hover:bg-white/10 text-slate-400 hover:text-white transition-colors font-bold"
                                            >+</button>
                                        </div>
                                        <span className="font-black text-[var(--accent)]">{(item.price * item.quantity).toLocaleString()} P</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={clearCart}
                            className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest pl-2"
                        >
                            전체 비우기
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card p-6 border-white/20 ring-1 ring-white/5">
                            <h2 className="text-xl font-black mb-6 border-b border-white/10 pb-4">결제 정보</h2>
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-sm text-slate-400 uppercase font-bold tracking-tight">
                                    <span>아이템 합계</span>
                                    <span className="text-white">{totalPrice.toLocaleString()} P</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-400 uppercase font-bold tracking-tight">
                                    <span>배송비</span>
                                    <span className={shippingFee === 0 ? 'text-green-400' : 'text-white'}>
                                        {shippingFee === 0 ? 'FREE' : `${shippingFee} P`}
                                    </span>
                                </div>
                                {shippingFee > 0 && (
                                    <p className="text-[10px] text-[var(--primary)] font-bold italic">
                                        💡 15P 이상 주문 시 배송비 면제!
                                    </p>
                                )}
                                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                    <span className="text-sm font-black uppercase tracking-widest text-slate-300">최종 사용 포인트</span>
                                    <span className="text-2xl font-black text-gradient">{finalPrice.toLocaleString()} P</span>
                                </div>
                            </div>

                            <button
                                onClick={handleOrder}
                                disabled={loading}
                                className="w-full btn-rocket py-4 text-sm tracking-widest uppercase shadow-[0_0_30px_rgba(255,77,0,0.2)]"
                            >
                                {loading ? '통신 중...' : '임무 시작 (주문하기)'}
                            </button>

                            <p className="text-center text-[9px] text-slate-500 mt-6 leading-relaxed font-bold uppercase tracking-tight">
                                * 주문 시 즉시 포인트가 차감되며,<br />
                                부모 대원의 승인 후 배송이 시작됩니다.
                            </p>
                        </div>

                        <div className="glass-card p-6 bg-[var(--primary)]/5 border-[var(--primary)]/20">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xl">🧑‍🚀</span>
                                <h4 className="text-sm font-black text-[var(--primary)] uppercase">대원 정보</h4>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                                현재 로그인한 대원: <span className="text-white font-bold">{session?.user?.name || 'GUEST'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
