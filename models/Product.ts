import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a product title.'],
        maxlength: [50, 'Title cannot be more than 50 characters'],
    },
    description: {
        type: String,
        default: '',
    },
    price: {
        type: Number,
        required: [true, 'Please provide a price (points).'],
        min: 0,
    },
    image: {
        type: String,
        default: '/images/boilerplate-product.png', // 기본 이미지 경로
    },
    stock: {
        type: Number,
        default: 1,
        min: 0,
    },
    category: {
        type: String,
        required: [true, 'Please specify a category.'], // e.g., 'Toy', 'Snack', 'Coupon'
    },
    type: {
        type: String,
        enum: ['buy', 'rent'],
        default: 'buy',
    },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
