import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const { items, shippingFee, totalPrice } = await req.json();

        // 1. Validate User Points
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.pointBalance < totalPrice) {
            return NextResponse.json({ error: '포인트가 부족합니다.' }, { status: 400 });
        }

        // 2. Validate Stock and Prepare Order Items
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new Error(`상품을 찾을 수 없습니다: ${item.title}`);
            }
            if (product.stock < item.quantity) {
                throw new Error(`재고가 부족합니다: ${item.title}`);
            }
        }

        // 3. Process Transaction (Simplified for standalone MongoDB)
        // Decrease Stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        // Deduct Points
        await User.findByIdAndUpdate(session.user.id, { $inc: { pointBalance: -totalPrice } });

        // Create Order
        const order = await Order.create({
            userId: session.user.id,
            items,
            shippingFee,
            totalPrice,
            status: 'pending',
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// Get User Orders
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const orders = await Order.find({ userId: session.user.id }).sort({ createdAt: -1 });
        return NextResponse.json(orders);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
