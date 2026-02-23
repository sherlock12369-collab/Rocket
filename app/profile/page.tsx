'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OrderItem {
    title: string;
    quantity: number;
    price: number;
    type: 'buy' | 'rent';
}

interface Order {
    _id: string;
    items: OrderItem[];
    totalPrice: number;
    status: string;
    createdAt: string;
    shippingFee: number;
}

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            fetchOrders();
        }
    }, [session]);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading') return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[var(--accent)] rounded-full animate-spin"></div>
        </div>
    );

    if (!session) return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="glass-card p-10 text-center max-w-sm w-full">
                <span className="text-5xl mb-6 block">🚫</span>
                <h2 className="text-xl font-black mb-4 uppercase tracking-tight">접근 거부</h2>
                <p className="text-slate-400 text-sm mb-8">대원 인증이 필요합니다.</p>
                <Link href="/auth/login" className="btn-rocket w-full">인증하러 가기</Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-gradient uppercase tracking-tighter">함선 일지 🛡️</h1>
                <Link href="/" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">홈으로</Link>
            </div>

            {/* User Info Card */}
            <div className="glass-card p-8 mb-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150 duration-700"></div>

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-2xl">
                        <div className="w-full h-full bg-[#112240] rounded-full flex items-center justify-center text-4xl overflow-hidden border-2 border-transparent">
                            {session.user.image ? <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" /> : '🚀'}
                        </div>
                    </div>

                    <div className="text-center md:text-left flex-grow">
                        <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                                {session.user.role === 'admin' ? 'Commander (Admin)' : 'Explorer (Member)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mb-1 leading-none">{session.user.name}</h2>
                        <p className="text-slate-400 text-sm font-medium italic opacity-70">Point Base Active</p>
                    </div>

                    <div className="md:border-l border-white/10 md:pl-6 text-center md:text-right">
                        <button
                            onClick={() => signOut()}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/20"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight">주문 보급 기록</h2>
                <div className="h-px bg-white/10 flex-grow mx-4"></div>
                <span className="text-[10px] font-bold text-slate-500">{orders.length} ITEMS</span>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 glass-card animate-pulse"></div>)}
                </div>
            ) : orders.length === 0 ? (
                <div className="glass-card py-20 text-center border-dashed">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">아직 기록된 보급이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <div key={order._id} className="glass-card p-6 group hover:border-[var(--accent)]/30 transition-all">
                            <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider 
                      ${order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' :
                                                order.status === 'approved' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/20' :
                                                    order.status === 'fulfilled' ? 'bg-green-500/20 text-green-500 border border-green-500/20' :
                                                        'bg-red-500/20 text-red-500 border border-red-500/20'}`}>
                                            {order.status === 'pending' ? '승인 대기' :
                                                order.status === 'approved' ? '배송 중' :
                                                    order.status === 'fulfilled' ? '배송 완료' : '반려됨'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                                            #{order._id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-bold">
                                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-gradient">{order.totalPrice.toLocaleString()} P</div>
                                    {order.shippingFee > 0 && <span className="text-[9px] text-slate-500 font-bold tracking-tight">배송비 {order.shippingFee}P 포함</span>}
                                </div>
                            </div>

                            <ul className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <li key={idx} className="flex justify-between items-center group/item">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-white/20 group-hover/item:bg-[var(--accent)] transition-colors"></div>
                                            <span className="text-sm font-bold text-slate-300 group-hover/item:text-white transition-colors">
                                                {item.type === 'rent' && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded mr-2 border border-blue-500/10 uppercase tracking-tighter">Rent</span>}
                                                {item.title}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">x{item.quantity}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-400">{(item.price * item.quantity).toLocaleString()} P</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
