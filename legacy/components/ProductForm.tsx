'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProductFormProps {
    initialData?: {
        title: string;
        price: number;
        description: string;
        image: string;
        stock: number;
        category: string;
        type: 'buy' | 'rent';
    };
    onSubmit: (data: any) => Promise<void>;
    isEdit?: boolean;
}

export default function ProductForm({ initialData, onSubmit, isEdit = false }: ProductFormProps) {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        price: initialData?.price || 0,
        description: initialData?.description || '',
        image: initialData?.image || '',
        stock: initialData?.stock || 1,
        category: initialData?.category || '',
        type: initialData?.type || 'buy',
    });
    const [uploadType, setUploadType] = useState<'url' | 'file'>('url');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'price' || name === 'stock' ? Number(value) : value,
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 파일 크기 제한 (예: 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('파일 크기가 너무 큽니다. 2MB 이하의 이미지를 선택해주세요.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData((prev) => ({
                ...prev,
                image: reader.result as string,
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(formData);
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto glass-card p-8">
            <h2 className="text-2xl font-black mb-6 text-gradient">{isEdit ? '아이템 수정' : '신규 아이템 등록'}</h2>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">상품명</label>
                <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="아이템 이름을 입력하세요"
                    className="modern-input"
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">가격 (포인트)</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        min="0"
                        className="modern-input"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">재고</label>
                    <input
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        required
                        min="0"
                        className="modern-input"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">유형</label>
                <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="modern-input"
                >
                    <option value="buy" className="bg-[#112240]">구매 (Buy)</option>
                    <option value="rent" className="bg-[#112240]">대여 (Rent)</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">카테고리</label>
                <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="예: 장난감, 간식, 쿠폰"
                    required
                    className="modern-input"
                />
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-tight">이미지 등록</label>
                <div className="flex gap-4 p-1 bg-white/5 rounded-2xl w-fit border border-white/5">
                    <button
                        type="button"
                        onClick={() => setUploadType('url')}
                        className={`text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all ${uploadType === 'url' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        URL 입력
                    </button>
                    <button
                        type="button"
                        onClick={() => setUploadType('file')}
                        className={`text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all ${uploadType === 'file' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        파일 업로드
                    </button>
                </div>

                {uploadType === 'url' ? (
                    <input
                        type="url"
                        name="image"
                        value={formData.image.startsWith('data:') ? '' : formData.image}
                        onChange={handleChange}
                        placeholder="https://example.com/image.jpg (미입력 시 기본 이미지)"
                        className="modern-input"
                    />
                ) : (
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="modern-input flex items-center justify-center border-dashed border-2 py-8 group-hover:border-[var(--accent)] group-hover:bg-white/5 transition-all">
                                <span className="text-xs font-bold text-slate-400">파일을 클릭하거나 드래그하세요</span>
                            </div>
                        </div>
                        {formData.image && formData.image.startsWith('data:') && (
                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 ring-4 ring-white/5 mx-auto">
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">설명 (선택)</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="modern-input resize-none"
                    placeholder="아이템에 대한 설명을 입력하세요"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full btn-rocket py-4 text-sm tracking-widest uppercase mt-4"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        데이터 전송 중...
                    </span>
                ) : isEdit ? '아이템 정보 수정' : '신규 아이템 등록'}
            </button>
        </form>
    );
}
