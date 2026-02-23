import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    title: { type: String, required: true }, // Snapshot of product title
    price: { type: Number, required: true }, // Snapshot of price at purchase
    quantity: { type: Number, default: 1 },
    type: { type: String, enum: ['buy', 'rent'], default: 'buy' },
});

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [OrderItemSchema],
    shippingFee: {
        type: Number,
        required: true,
        default: 0,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'fulfilled', 'rejected', 'return_requested', 'returned'],
        default: 'pending',
    },
    rentedAt: { type: Date, default: null },         // 배송 완료(fulfilled) 시각 - 반납 기한 계산 기준
    penaltyDaysCharged: { type: Number, default: 0 }, // 이미 차감 처리된 페널티 일수

}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
