'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

interface Product {
  _id: string;
  title: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  category: string;
  type: 'buy' | 'rent';
}

export default function Home() {
  const { data: session } = useSession();
  const { addToCart, cartCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart({
      productId: product._id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: 1,
      type: product.type,
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
      } else {
        alert('삭제 실패');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header / GNB */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050A18]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl transition-transform group-hover:rotate-12">🚀</span>
            <h1 className="text-xl font-black tracking-tighter text-gradient uppercase">Rocket</h1>
          </Link>

          <div className="flex gap-4 items-center">
            <Link href="/cart" className="relative p-2.5 hover:bg-white/5 rounded-2xl transition-colors group">
              <span className="text-xl transition-transform group-hover:scale-110 block">🛒</span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#050A18] animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>

            {session ? (
              <div className="flex items-center gap-3">
                <Link href="/profile" className="flex items-center gap-2.5 pl-1 pr-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-[1px]">
                    <div className="w-full h-full rounded-full bg-[#112240] flex items-center justify-center overflow-hidden">
                      {session.user?.image ? (
                        <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">🧑‍🚀</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold max-w-[80px] truncate group-hover:text-[var(--accent)]">{session.user?.name}</span>
                </Link>
                {session.user.role === 'admin' && (
                  <Link href="/admin/products/new" className="btn-rocket text-xs py-2 h-9">
                    <span className="text-sm">+</span> 등록
                  </Link>
                )}
              </div>
            ) : (
              <Link href="/auth/login" className="text-sm font-bold text-white/70 hover:text-white transition-colors border-b border-transparent hover:border-white">
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-20">
        {/* Banner Section */}
        <section className="mb-12 relative overflow-hidden rounded-[2rem] p-10 bg-[var(--surface-solid)] border border-white/5">
          <div className="relative z-10 max-w-lg">
            <span className="inline-block px-3 py-1 bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest rounded-full mb-4">Family Private Mall</span>
            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              우주에서 가장 <br />
              <span className="text-[var(--accent)]">특별한 쇼핑</span> 체험
            </h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              가족 대원들을 위한 로켓 포인트 전용 쇼핑몰에 오신 것을 환영합니다.
              지금 바로 대원 코드로 접속해 혜택을 확인하세요.
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-[var(--primary)]/10 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-[var(--accent)]/10 blur-[80px] rounded-full"></div>
          <div className="absolute -top-10 -right-10 opacity-10 hidden lg:block transform rotate-12 transition-transform hover:rotate-0 duration-1000 select-none pointer-events-none">
            <span className="text-[200px]">🚀</span>
          </div>
        </section>

        {/* Product Grid */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black">대원 전용 아이템</h3>
          <div className="flex gap-2">
            <div className="h-1 w-8 bg-[var(--primary)] rounded-full"></div>
            <div className="h-1 w-2 bg-white/20 rounded-full"></div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] glass-card animate-pulse bg-white/5"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product._id} className="group glass-card overflow-hidden flex flex-col h-full relative">
                {session?.user.role === 'admin' && (
                  <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <Link href={`/admin/products/${product._id}/edit`} className="bg-white/10 hover:bg-blue-500 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[10px] font-bold border border-white/20 transition-colors">수정</Link>
                    <button onClick={(e) => handleDelete(product._id, e)} className="bg-white/10 hover:bg-red-500 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[10px] font-bold border border-white/20 transition-colors">삭제</button>
                  </div>
                )}

                <div className="aspect-square relative overflow-hidden bg-white/5">
                  <img
                    src={product.image || '/images/boilerplate-product.png'}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Rocket+Store';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050A18] via-transparent to-transparent opacity-60"></div>

                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-xl">
                      <span className="text-sm font-black text-[var(--accent)] tracking-tight">{product.price.toLocaleString()} <span className="text-[10px] opacity-70">P</span></span>
                    </div>
                    {product.type === 'rent' && (
                      <span className="bg-blue-500 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-lg border border-blue-400/50">Rent</span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow">
                  <div className="mb-1">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{product.category}</span>
                  </div>
                  <h3 className="font-bold text-base mb-2 line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{product.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">{product.description || '아이템 설명이 없습니다.'}</p>

                  <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Stock: <span className={product.stock > 0 ? 'text-green-400' : 'text-red-400'}>{product.stock}</span></span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className={`btn-rocket text-[10px] px-4 py-2 h-8 ${product.stock === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    >
                      {product.stock === 0 ? '품절' : '담기'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="glass-card py-24 text-center">
            <span className="text-6xl mb-6 block opacity-20">🛸</span>
            <p className="text-slate-400 font-medium">
              아직 등록된 아이템이 없습니다.<br />
              {session?.user.role === 'admin' ? '함선의 자원을 등록해 주세요!' : '본부에서 아이템을 등록할 때까지 기다려 주세요.'}
            </p>
          </div>
        )}
      </main>

      {/* Footer Meta */}
      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        <p>© 2026 Rocket Family Mall - All Systems Nominal</p>
        <div className="flex gap-6">
          <span className="hover:text-white transition-colors cursor-help">Security: AES-256</span>
          <span className="hover:text-white transition-colors cursor-help">Database: MongoDB Atlas</span>
          <span className="hover:text-[var(--primary)] transition-colors">By Antigravity</span>
        </div>
      </footer>
    </div>
  );
}
