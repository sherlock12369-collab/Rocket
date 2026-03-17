import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import User from '../models/User.ts';
import Product from '../models/Product.ts';
import Order from '../models/Order.ts';
import Mission from '../models/Mission.ts';
import Auction from '../models/Auction.ts';

// Load environment variables (.env.local for local, .env or system env for production)
dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
    dotenv.config();
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log('🏁 서버 초기화 시작 (PORT:', PORT, ') - Ver. 2026.02.25.2');

app.use(express.json({ limit: '10mb' }));
app.use(cors());

mongoose.connect(process.env.MONGODB_URI!)
    .then(async () => {
        console.log('✅ MongoDB 연결 성공 (Atlas)');
        // Auto-seed admin if not exists
        try {
            const adminExists = await User.findOne({ username: 'sherlock' });
            if (!adminExists) {
                const hashedPassword = await bcrypt.hash('rocket1234', 10);
                const admin = new User({
                    username: 'sherlock',
                    password: hashedPassword,
                    plainPassword: 'rocket1234',
                    name: 'Sherlock',
                    role: 'admin',
                    pointBalance: 999999
                });
                await admin.save();
                console.log('🚀 [Auto-Seed] 관리자 계정(sherlock)이 생성되었습니다.');
            }
        } catch (err) {
            console.error('❌ [Auto-Seed] 실패:', err);
        }

        // Auto-Fix: 승인 필드가 없는 기존 상품들을 일괄 승인(true) 처리하여 노출 복구
        try {
            const updateResult = await Product.updateMany(
                { isApproved: { $exists: false } },
                { $set: { isApproved: true } }
            );
            if (updateResult.modifiedCount > 0) {
                console.log(`🚀 [Auto-Fix] ${updateResult.modifiedCount}개의 기존 상품을 승인 상태로 복구했습니다.`);
            }
        } catch (err) {
            console.error('❌ [Auto-Fix] 실패:', err);
        }
    })
    .catch((err: any) => {
        console.error('❌ MongoDB 연결 실패:', err.message);
    });


// Health Check for Render
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        version: '2026.02.25.1',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ─── Auth Middleware ──────────────────────────────────────────
interface AuthRequest extends Request {
    user?: any;
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
};

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
};

// Helper: Add Notification
const addNotification = async (userId: any, message: string, type: string = 'info') => {
    try {
        await User.findByIdAndUpdate(userId, {
            $push: {
                notifications: {
                    message,
                    type,
                    createdAt: new Date(),
                    read: false
                }
            }
        });
    } catch (err) {
        console.error('Notification Error:', err);
    }
};

// ─── BACKGROUND JOBS ─────────────────────────────────────────
// 매 분마다 경매 종료 여부를 체크 (Cron)
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const expiredAuctions = await Auction.find({ status: 'active', endTime: { $lte: now } });

        for (const auction of expiredAuctions) {
            auction.status = 'ended';
            await auction.save();

            if (auction.highestBidder) {
                // 낙찰 성공
                await addNotification(
                    auction.highestBidder, 
                    `🎉 축하합니다! 희귀품 경매 '${auction.title}'건이 ${auction.currentBid}P에 최종 낙찰되었습니다. (배송 준비 중)`, 
                    'success'
                );
                // (선택) 여기서 자동으로 Order 콜렉션에 주문을 넣어주거나 관리자 승인 대기 상태로 만들 수 있음
                const order = new Order({
                    userId: auction.highestBidder,
                    items: [{
                        title: `[경매 낙찰품] ${auction.title}`,
                        price: auction.currentBid,
                        image: auction.image,
                        category: 'Auction',
                        type: 'buy',
                        status: 'pending'
                    }],
                    totalPrice: auction.currentBid,
                    address: '사령부 특급 직배송',
                    status: 'pending'
                });
                await order.save();
            } else {
                // 유찰
                console.log(`🔨 경매 '${auction.title}' - 입찰자 없이 종료(유찰)되었습니다.`);
            }
        }
    } catch (err) {
        console.error('Auction Cron Error:', err);
    }
});

// ─── Public Routes ────────────────────────────────────────────


// Seed
app.get('/api/seed', async (req: Request, res: Response) => {
    try {
        const adminExists = await User.findOne({ username: 'sherlock' });
        if (adminExists) return res.send('Admin already exists: sherlock / rocket1234');
        const hashedPassword = await bcrypt.hash('rocket1234', 10);
        const admin = new User({ username: 'sherlock', password: hashedPassword, plainPassword: 'rocket1234', name: 'Sherlock', role: 'admin', pointBalance: 999999 });
        await admin.save();
        res.send('✅ Admin created: sherlock / rocket1234');
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: '존재하지 않는 아이디입니다.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                pointBalance: user.pointBalance,
                membershipTier: (user as any).membershipTier || 'normal'
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Products: Public List (Approved only)
app.get('/api/products', async (req: Request, res: Response) => {
    try {
        const items = await Product.find({ isApproved: true }).sort({ createdAt: -1 }).allowDiskUse(true);
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Products: Admin List (All)
app.get('/api/admin/products', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const items = await Product.find().populate('sellerId', 'name username').sort({ createdAt: -1 }).allowDiskUse(true);
        res.json(items);
    } catch (error: any) {
        console.error('API /admin/products Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Products: Sell Request (User)
app.post('/api/products/sell', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { title, description, price, category, image, type } = req.body;
    try {
        const product = new Product({
            title,
            description,
            price,
            category,
            image,
            type: type || 'buy',
            sellerId: req.user.id,
            isApproved: false, // 대원 상품은 미승인 시작
            stock: 1, // 기본 1개
            commissionRate: 0.1 // 기본 10%
        });
        await product.save();
        res.json({ message: '보급품 판매 제안이 전송되었습니다! 지휘관님의 승인을 기다리세요. 🚀', product });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Products: Update (Admin)
app.patch('/api/products/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, description, price, category, stock, type, image, isApproved, commissionRate } = req.body;
    try {
        const product = await Product.findByIdAndUpdate(
            id,
            { title, description, price, category, stock, type, image, isApproved, commissionRate },
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
        res.json({ message: '상품이 수정되었습니다.', product });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Products: Delete (Admin)
app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        await Product.findByIdAndDelete(id);
        res.json({ message: '상품이 삭제되었습니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Protected Routes (Login Required) ───────────────────────

// Profile: Get Current User Info
app.get('/api/me', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({
            user: {
                ...user.toObject(),
                membershipTier: (user as any).membershipTier || 'normal'
            },
            orders
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Daily Roulette: Spin for 1-5 Points
app.post('/api/me/roulette', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

        const now = new Date();
        const lastDate = (user as any).lastRouletteDate;
        
        // 24시간 체크 (간단히 날짜가 다르면 가능하도록 처리)
        if (lastDate && lastDate.toDateString() === now.toDateString()) {
            return res.status(400).json({ error: '오늘은 이미 룰렛을 돌리셨습니다! 내일 다시 시도해주세요.' });
        }

        const wonPoints = Math.floor(Math.random() * 5) + 1; // 1 to 5
        user.pointBalance += wonPoints;
        (user as any).lastRouletteDate = now;
        
        // 알림도 추가
        user.notifications.push({
            message: `🎰 일일 보급품 룰렛에서 ${wonPoints}P에 당첨되었습니다!`,
            type: 'success',
            read: false,
            createdAt: now
        } as any);

        await user.save();
        res.json({ message: `${wonPoints}P 당첨!`, wonPoints, pointBalance: user.pointBalance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Notifications: Mark as read
app.patch('/api/me/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        await User.updateOne(
            { _id: req.user.id, "notifications._id": req.params.id },
            { $set: { "notifications.$.read": true } }
        );
        res.json({ message: '알림을 확인했습니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Notifications: Clear all
app.delete('/api/me/notifications/clear', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $set: { notifications: [] } });
        res.json({ message: '모든 알림이 삭제되었습니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Orders: Place Order
app.post('/api/orders', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { items } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

        const isStar = (user as any).membershipTier === 'star';

        // 재고 확인 및 차감
        for (const item of items) {
            if (!item.productId) continue;
            const product = await Product.findById(item.productId);
            if (!product) continue;
            if (product.stock < (item.quantity || 1)) {
                return res.status(400).json({ error: `'${product.title}' 재고가 부족합니다. (남은 재고: ${product.stock})` });
            }
            product.stock -= (item.quantity || 1);
            await product.save();
        }

        // ⭐ Star 혜택: 총 수량 5개 이상 시 50% 할인
        const totalQty = (items as any[]).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
        let basePrice = (items as any[]).reduce((sum: number, i: any) => sum + i.price * (i.quantity || 1), 0);
        let discountApplied = false;
        if (isStar && totalQty >= 5) {
            basePrice = Math.floor(basePrice * 0.5);
            discountApplied = true;
        }

        // ⭐ Star 혜택 또는 9P 이상 구매 시 배송비 면제
        const shippingFee = (isStar || basePrice >= 9) ? 0 : 50;
        const finalPrice = basePrice + shippingFee;

        if (user.pointBalance < finalPrice) return res.status(400).json({ error: '포인트가 부족합니다.' });

        user.pointBalance -= finalPrice;
        await user.save();

        const { deliveryAddress } = req.body;
        const order = new Order({ 
            userId: req.user.id, 
            items, 
            totalPrice: finalPrice, 
            status: 'pending',
            deliveryAddress: deliveryAddress || '' 
        });
        await order.save();
        res.json({
            message: '주문이 완료되었습니다!',
            order,
            newBalance: user.pointBalance,
            shippingFee,
            discountApplied,
            finalPrice
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Orders: Request Return (반납/반품 요청 - 사용자)
app.post('/api/orders/:id/request-return', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body; // 선택적: 사유 메모
    try {
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
        if (order.userId.toString() !== req.user.id) return res.status(403).json({ error: '본인 주문이 아닙니다.' });
        if (order.status !== 'fulfilled') {
            return res.status(400).json({ error: '배송 완료된 주문만 반납/반품 요청할 수 있습니다.' });
        }
        order.status = 'return_requested';
        if (reason) (order as any).returnReason = reason;
        await order.save();
        res.json({ message: '반납 요청이 접수되었습니다. 지휘관의 확인 후 처리됩니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/missions/report', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { title, proofText, proofImage, rewardPoints } = req.body;
    try {
        const mission = new Mission({ userId: req.user.id, title, proofText, proofImage, rewardPoints, status: 'pending' });
        await mission.save();
        res.json({ message: '미션 보고서가 제출되었습니다.', mission });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Admin-Only Routes ────────────────────────────────────────

// Admin: Register New Member
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { username, password, name, role, initialPoints } = req.body;
    try {
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, plainPassword: password, name, role: role || 'user', pointBalance: initialPoints || 0 });
        await newUser.save();
        res.json({ message: '대원이 성공적으로 등록되었습니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get All Users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Adjust User Points
app.patch('/api/admin/users/:id/points', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        user.pointBalance = Math.max(0, user.pointBalance + Number(amount));
        await user.save();
        res.json({ message: `포인트가 ${amount > 0 ? '+' : ''}${amount}P 조정되었습니다.`, pointBalance: user.pointBalance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Update User Info (General)
app.patch('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { username, password, name, role, membershipTier } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

        // 아이디 중복 체크 (변경된 경우만)
        if (username && username !== user.username) {
            const existing = await User.findOne({ username });
            if (existing) return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
            user.username = username;
        }

        if (name) user.name = name;
        if (role) user.role = role;
        if (membershipTier) user.membershipTier = membershipTier;

        // 비밀번호 변경 처리 (제공된 경우만)
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            (user as any).plainPassword = password;
        }

        await user.save();
        res.json({ message: '대원 정보가 수정되었습니다.', user });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Delete User
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        if (user.username === 'sherlock') return res.status(403).json({ error: '시스템 관리자는 삭제할 수 없습니다.' });
        await User.findByIdAndDelete(id);
        res.json({ message: `'${user.name}' 대원이 삭제되었습니다.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: User List (all users)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Give/Deduct Points
app.patch('/api/admin/users/:id/points', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        user.pointBalance += amount;
        res.json({ message: '포인트가 업데이트되었습니다.', pointBalance: user.pointBalance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Address Management: Add
app.post('/api/me/addresses', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { address } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $addToSet: { savedAddresses: address } },
            { new: true }
        );
        res.json({ message: '주소가 저장되었습니다.', savedAddresses: user.savedAddresses });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Address Management: Delete
app.delete('/api/me/addresses', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { address } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { savedAddresses: address } },
            { new: true }
        );
        res.json({ message: '주소가 삭제되었습니다.', savedAddresses: user.savedAddresses });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Create Product
app.post('/api/products', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.json(product);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Delete Product
app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: '상품이 삭제되었습니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── AUCTIONS ───────────────────────────────────────────
// Auctions: List (Public)
app.get('/api/auctions', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const auctions = await Auction.find().populate('highestBidder', 'name username').sort({ endTime: 1 });
        res.json(auctions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Create Auction
app.post('/api/admin/auctions', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, image, startingBid, endTime } = req.body;
        if (!title || startingBid === undefined || !endTime) {
            return res.status(400).json({ error: '필수 정보(제목, 시작가, 종료시간)가 누락되었습니다.' });
        }
        
        const auction = new Auction({
            title,
            description,
            image,
            startingBid: Number(startingBid),
            currentBid: Number(startingBid),
            endTime: new Date(endTime),
            status: 'active'
        });
        await auction.save();
        res.json(auction);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Auctions: Place a Bid
app.post('/api/auctions/:id/bid', authenticateToken, async (req: AuthRequest, res: Response) => {
    // 몽구스 트랜잭션을 사용하면 좋으나, 단일 노드 몽고DB 환경일 가능성을 고려해 순차적 락 기반 처리 시뮬레이션
    try {
        const { bidAmount } = req.body;
        const amount = Number(bidAmount);
        if (!amount || amount <= 0) return res.status(400).json({ error: '유효한 입찰 금액을 입력하세요.' });

        // 1. 경매품 가져오기
        const auction = await Auction.findById(req.params.id);
        if (!auction) return res.status(404).json({ error: '경매를 찾을 수 없습니다.' });
        if (auction.status !== 'active' || new Date(auction.endTime) <= new Date()) {
            auction.status = 'ended';
            await auction.save();
            return res.status(400).json({ error: '이미 종료된 경매입니다.' });
        }
        if (amount <= auction.currentBid) {
            return res.status(400).json({ error: `현재 최고 입찰가(${auction.currentBid}P)보다 높은 금액을 제시해야 합니다.` });
        }

        // 2. 현재 입찰자 정보 확인
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        if (currentUser.pointBalance < amount) {
            return res.status(400).json({ error: '포인트가 부족합니다.' });
        }

        // 3. 이전 최고 입찰자가 있다면 환급 처리 및 알림 (본인이 갱신하는 특수 케이스 포함)
        if (auction.highestBidder) {
            if (auction.highestBidder.toString() === req.user.id) {
                // 본인이 자기 입찰가를 올리는 경우: 차액만 뺌
                const diff = amount - auction.currentBid;
                if (currentUser.pointBalance < diff) return res.status(400).json({ error: '포인트가 부족합니다.' });
                currentUser.pointBalance -= diff;
            } else {
                // 다른 사람의 입찰가를 갈아치운 경우
                const previousBidder = await User.findById(auction.highestBidder);
                if (previousBidder) {
                    previousBidder.pointBalance += auction.currentBid; // 이전 금액 환불
                    previousBidder.notifications.push({
                        message: `🔨 [상회 입찰 발생] 누군가 '${auction.title}' 경매에 더 높은 금액을 불렀습니다! 예약된 ${auction.currentBid}P가 환불되었습니다.`,
                        type: 'warning',
                        read: false,
                        createdAt: new Date()
                    } as any);
                    await previousBidder.save();
                }
                // 새로운 1등은 전체 금액 차감
                currentUser.pointBalance -= amount;
            }
        } else {
            // 최초 입찰자
            currentUser.pointBalance -= amount;
        }

        await currentUser.save();

        // 4. 경매품 상태 갱신
        auction.currentBid = amount;
        auction.highestBidder = currentUser._id;
        await auction.save();

        res.json({ message: '성공적으로 입찰되었습니다!', auction, pointBalance: currentUser.pointBalance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Delete Auction (Emergency)
app.delete('/api/admin/auctions/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const auction = await Auction.findById(req.params.id);
        if (!auction) return res.status(404).json({ error: '경매를 찾을 수 없습니다.' });

        // 최고 입찰자가 이미 있다면 포인트 환불 처리
        if (auction.highestBidder) {
            const bidder = await User.findById(auction.highestBidder);
            if (bidder) {
                bidder.pointBalance += auction.currentBid;
                bidder.notifications.push({
                    message: `⚠️ [경매 취소] 관리자에 의해 '${auction.title}' 경매가 취소되어, 예약된 ${auction.currentBid}P가 환불되었습니다.`,
                    type: 'error',
                    read: false,
                    createdAt: new Date()
                } as any);
                await bidder.save();
            }
        }
        await Auction.findByIdAndDelete(req.params.id);
        res.json({ message: '경매가 삭제되었습니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: List Orders
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const items = await Order.find().populate('userId', 'name username').sort({ createdAt: -1 });
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Analytics Dashboard Data
app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        // 1. 전체 떠도는 포인트 총합 (Total Floating Points)
        const allUsers = await User.find({ role: 'user' });
        const totalFloatingPoints = allUsers.reduce((sum, u) => sum + (u.pointBalance || 0), 0);

        // 2. 누적 매출 & 가장 많이 팔린 아이템 (최근 30일)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentOrders = await Order.find({ 
            createdAt: { $gte: thirtyDaysAgo },
            status: { $in: ['fulfilled', 'pending'] } 
        });

        let totalRevenue = 0;
        const itemSalesCounter: Record<string, { count: number, revenue: number }> = {};
        
        recentOrders.forEach(order => {
            totalRevenue += order.totalPrice;
            order.items.forEach((item: any) => {
                const title = item.title;
                const qty = item.quantity || 1;
                const price = item.price || 0;
                
                if (!itemSalesCounter[title]) {
                    itemSalesCounter[title] = { count: 0, revenue: 0 };
                }
                itemSalesCounter[title].count += qty;
                itemSalesCounter[title].revenue += (price * qty);
            });
        });

        // 3. 가장 많이 팔린 아이템 Top 5 추출 (매출액 기준 정렬로 고도화)
        const topItems = Object.entries(itemSalesCounter)
            .map(([title, data]) => ({ title, count: data.count, revenue: data.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // 3. 일자별 매출 동향 (차트 곡선용)
        const dailyRevenue: Record<string, number> = {};
        recentOrders.forEach(order => {
            const dateStr = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!dailyRevenue[dateStr]) dailyRevenue[dateStr] = 0;
            dailyRevenue[dateStr] += order.totalPrice;
        });

        const sortedDailyRevenue = Object.entries(dailyRevenue)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        res.json({
            summary: {
                totalFloatingPoints,
                totalRevenue30Days: totalRevenue,
                totalOrders30Days: recentOrders.length
            },
            topItems,
            dailyRevenue: sortedDailyRevenue
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Update Order Status
app.patch('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const order = await Order.findById(id).populate('userId');
        if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
        const previousStatus = order.status;
        order.status = status;

        // 개별 아이템들의 상태도 주문 전체 상태에 맞게 동기화 (이미 처리된 아이템 제외)
        order.items.forEach((item: any) => {
            if (item.status !== 'returned' && item.status !== 'rejected') {
                item.status = status;
            }
        });

        // fulfilled 전환 시: 알림 전송 + 정산 + 대여 기록
        if (status === 'fulfilled' && previousStatus !== 'fulfilled') {
            const hasRent = (order.items as any[]).some((i: any) => i.type === 'rent');
            if (hasRent) (order as any).rentedAt = new Date();
        }
        // 반려 시: 포인트 환급 + 재고 복구
        if (status === 'rejected' && previousStatus !== 'rejected') {
            const user = await User.findById((order.userId as any)._id || order.userId);
            if (user) { user.pointBalance += order.totalPrice; await user.save(); }
            for (const item of order.items as any[]) {
                if (!item.productId) continue;
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity || 1 } });
            }
        }
        // 반납/반품 승인 시
        if (status === 'returned' && previousStatus !== 'returned') {
            const user = await User.findById((order.userId as any)._id || order.userId);
            if (user) {
                const isStar = (user as any).membershipTier === 'star';
                const refundRate = isStar ? 0.6 : 0.5; // ⭐ Star: 60%, 일반: 50%
                let refundAmount = 0;
                for (const item of order.items as any[]) {
                    const itemTotal = item.price * (item.quantity || 1);
                    if (item.type === 'rent') {
                        refundAmount += 0; // 반납: 환급 없음
                    } else {
                        refundAmount += Math.floor(itemTotal * refundRate);
                    }
                    
                    // 만약 사용자 판매 상품(sellerId 존재)이라면 재고 복구
                    if (item.productId) {
                        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity || 1 } });
                    }
                }
                if (refundAmount > 0) { user.pointBalance += refundAmount; await user.save(); }
            }
        }
        
        // 배송 완료(fulfilled) 시: 판매자에게 정산 (수수료 제함)
        if (status === 'fulfilled' && previousStatus !== 'fulfilled') {
            for (const item of order.items as any[]) {
                if (!item.productId) continue;
                const product = await Product.findById(item.productId);
                if (product && product.sellerId) {
                    const seller = await User.findById(product.sellerId);
                    if (seller) {
                        const commission = Math.floor(item.price * (item.quantity || 1) * (product.commissionRate || 0.1));
                        const settlement = (item.price * (item.quantity || 1)) - commission;
                        seller.pointBalance += settlement;
                        await seller.save();
                        console.log(`💰 [Settlement] ${seller.name}에게 ${settlement}P 정산 완료 (수수료: ${commission}P)`);
                        
                        // 판매자에게도 정산 알림
                        await addNotification(seller._id, `[정산] 보급품 '${item.title}' 판매 대금 ${settlement}P가 입급되었습니다. (수수료 제함)`, 'success');
                    }
                }
            }
            // 구매자에게 배송 완료 알림
            await addNotification(order.userId._id, `[배송] 주문하신 '${order.items[0].title}${order.items.length > 1 ? ' 외 ' + (order.items.length - 1) + '건' : ''}' 보급이 완료되었습니다! 🚀`, 'success');
        }
        await order.save();
        res.json({ message: `주문 상태가 '${status}'(으)로 변경되었습니다.`, order });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Update Individual Item Status
app.patch('/api/admin/orders/:orderId/items/:itemId/status', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });

        const item = (order.items as any[]).find(i => i._id.toString() === itemId);
        if (!item) return res.status(404).json({ error: '물품을 찾을 수 없습니다.' });

        const prevItemStatus = item.status;
        item.status = status;

        // 개별 물품 반려 시 환불 로직
        if (status === 'rejected' && prevItemStatus !== 'rejected') {
            const user = await User.findById(order.userId);
            if (user) {
                user.pointBalance += (item.price * item.quantity);
                await user.save();
                await addNotification(user._id, `[반려] '${item.title}' 보급이 반려되어 ${(item.price * item.quantity)}P가 환불되었습니다.`, 'warning');
            }
            // 재고 복구
            if (item.productId) await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }

        // 개별 물품 반품 승인 시 환불 로직
        if (status === 'returned' && prevItemStatus !== 'returned') {
            const user = await User.findById(order.userId);
            if (user) {
                const refundRate = user.membershipTier === 'star' ? 0.6 : 0.5;
                const refundAmount = item.type === 'rent' ? 0 : Math.floor(item.price * item.quantity * refundRate);
                if (refundAmount > 0) {
                    user.pointBalance += refundAmount;
                    await user.save();
                    await addNotification(user._id, `[반품완료] '${item.title}' 반품이 승인되어 ${refundAmount}P가 환불되었습니다.`, 'success');
                } else if (item.type === 'rent') {
                    await addNotification(user._id, `[반납완료] '${item.title}'이 정상적으로 함선으로 귀환했습니다.`, 'success');
                }
            }
            if (item.productId) await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }

        // 개별 물품 배송 완료 시 정산 로직
        if (status === 'fulfilled' && prevItemStatus !== 'fulfilled') {
            const product = await Product.findById(item.productId);
            if (product && product.sellerId) {
                const seller = await User.findById(product.sellerId);
                if (seller) {
                    const commission = Math.floor(item.price * item.quantity * (product.commissionRate || 0.1));
                    const settlement = (item.price * item.quantity) - commission;
                    seller.pointBalance += settlement;
                    await seller.save();
                    await addNotification(seller._id, `[정산] 보급품 '${item.title}' 판매 대금 ${settlement}P가 입금되었습니다.`, 'success');
                }
            }
        }

        await order.save();
        res.json({ message: '물품 상태가 업데이트되었습니다.', item });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// User: Request Individual Item Return
app.post('/api/orders/:orderId/items/:itemId/request-return', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { orderId, itemId } = req.params;
    try {
        const order = await Order.findOne({ _id: orderId, userId: req.user.id });
        if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });

        const item = (order.items as any[]).find(i => i._id.toString() === itemId);
        if (!item) return res.status(404).json({ error: '물품을 찾을 수 없습니다.' });

        if (item.status !== 'fulfilled') return res.status(400).json({ error: '이미 보급이 완료된 물품만 반품 요청이 가능합니다.' });

        item.status = 'return_requested';
        await order.save();

        res.json({ message: `${item.type === 'rent' ? '반납' : '반품'} 요청이 지휘관에게 전송되었습니다. 🚀` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Rental: Check overdue & apply penalty (로그인 시 호출)
app.get('/api/me/rental-check', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const GRACE_HOURS = 24;
        const now = new Date();

        const overdueOrders = await Order.find({
            userId: req.user.id,
            status: 'fulfilled',
            rentedAt: { $ne: null }
        });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

        const alerts: any[] = [];
        let totalPenaltyNow = 0;

        for (const order of overdueOrders) {
            const hasRent = (order.items as any[]).some((i: any) => i.type === 'rent');
            if (!hasRent || !(order as any).rentedAt) continue;

            const rentedAt = new Date((order as any).rentedAt);
            const deadlineDate = new Date(rentedAt.getTime() + GRACE_HOURS * 60 * 60 * 1000);
            const msElapsed = now.getTime() - rentedAt.getTime();
            const hoursElapsed = msElapsed / (1000 * 60 * 60);

            // 반납 물품 정보
            const rentItems = (order.items as any[])
                .filter((i: any) => i.type === 'rent')
                .map((i: any) => ({ title: i.title, quantity: i.quantity || 1 }));
            const deadlineStr = deadlineDate.toLocaleString('ko-KR', {
                month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            if (hoursElapsed <= GRACE_HOURS) {
                const hoursLeft = Math.ceil(GRACE_HOURS - hoursElapsed);
                alerts.push({
                    orderId: order._id,
                    items: rentItems,
                    status: 'due_soon',
                    deadline: deadlineStr,
                    message: `반납 기한까지 ${hoursLeft}시간 남았습니다`,
                    hoursLeft,
                    penaltyPerDay: 1
                });
            } else {
                const overdueDays = Math.floor((hoursElapsed - GRACE_HOURS) / 24);
                const alreadyCharged = (order as any).penaltyDaysCharged || 0;
                const newPenaltyDays = overdueDays - alreadyCharged;

                if (newPenaltyDays > 0) {
                    const penalty = newPenaltyDays * 1;
                    user.pointBalance = Math.max(0, user.pointBalance - penalty);
                    (order as any).penaltyDaysCharged = overdueDays;
                    await order.save();
                    totalPenaltyNow += penalty;
                }

                alerts.push({
                    orderId: order._id,
                    items: rentItems,
                    status: 'overdue',
                    deadline: deadlineStr,
                    message: `반납 기한 ${overdueDays}일 초과`,
                    overdueDays,
                    totalPenalty: (order as any).penaltyDaysCharged
                });
            }
        }

        if (totalPenaltyNow > 0) await user.save();

        res.json({ alerts, newPointBalance: user.pointBalance, penaltyApplied: totalPenaltyNow });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Create Mission (어드민이 미션 직접 생성)
app.post('/api/admin/missions', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { title, description, rewardPoints } = req.body;
    try {
        if (!title || !rewardPoints) return res.status(400).json({ error: '미션 제목과 보상 포인트를 입력하세요.' });
        const mission = new Mission({
            userId: req.user.id,
            title,
            proofText: description || '',
            rewardPoints: Number(rewardPoints),
            status: 'admin_created'   // 어드민 생성 미션은 별도 상태
        });
        await mission.save();
        res.json({ message: '미션이 생성되었습니다.', mission });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: List Missions (사용자가 제출한 리포트 목록만)
app.get('/api/admin/missions', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        // status가 'admin_created'인 것은 어드민이 생성한 템플릿이므로 제외
        const missions = await Mission.find({ status: { $ne: 'admin_created' } })
            .populate('userId', 'name username')
            .sort({ createdAt: -1 });
        res.json(missions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Approve/Reject Mission
app.patch('/api/admin/missions/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const mission = await Mission.findById(id);
        if (!mission) return res.status(404).json({ error: '미션을 찾을 수 없습니다.' });
        if (status === 'approved' && mission.status !== 'approved') {
            const user = await User.findById(mission.userId);
            if (user) { user.pointBalance += mission.rewardPoints; await user.save(); }
        }
        mission.status = status;
        await mission.save();
        res.json({ message: `미션이 '${status}'으로 처리되었습니다.`, mission });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Delete Mission
app.delete('/api/admin/missions/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const mission = await Mission.findByIdAndDelete(id);
        if (!mission) return res.status(404).json({ error: '미션을 찾을 수 없습니다.' });
        res.json({ message: '미션이 삭제되었습니다.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// === 🕛 자동 페널티 스케줄러 (매일 자정 실행) ===
async function applyDailyRentalPenalties() {
    console.log('⏰ [Scheduler] 대여 페널티 자동 차감 시작...');
    const GRACE_HOURS = 24;
    const now = new Date();
    try {
        // fulfilled + rentedAt 있는 모든 주문
        const rentOrders = await Order.find({ status: 'fulfilled', rentedAt: { $ne: null } });
        let deductedCount = 0;
        for (const order of rentOrders) {
            const hasRent = (order.items as any[]).some((i: any) => i.type === 'rent');
            if (!hasRent || !(order as any).rentedAt) continue;

            const rentedAt = new Date((order as any).rentedAt);
            const hoursElapsed = (now.getTime() - rentedAt.getTime()) / (1000 * 60 * 60);
            if (hoursElapsed <= GRACE_HOURS) continue;

            const overdueDays = Math.floor((hoursElapsed - GRACE_HOURS) / 24);
            const alreadyCharged = (order as any).penaltyDaysCharged || 0;
            const newDays = overdueDays - alreadyCharged;
            if (newDays <= 0) continue;

            const user = await User.findById(order.userId);
            if (!user) continue;

            user.pointBalance = Math.max(0, user.pointBalance - newDays);
            (order as any).penaltyDaysCharged = overdueDays;
            await user.save();
            await order.save();
            deductedCount++;
            console.log(`  → ${user.name}: -${newDays}P (전체 ${overdueDays}일 초과)`);
        }
        console.log(`✅ [Scheduler] 완료: ${deductedCount}건 처리됨`);
    } catch (err) {
        console.error('❌ [Scheduler] 페널티 처리 오류:', err);
    }
}

// 매일 자정(00:00) 실행
cron.schedule('0 0 * * *', applyDailyRentalPenalties, {
    timezone: 'Asia/Seoul'
});

// ⭐ Star 회원 월정액 100P 차감 (KST 매월 1일 자정)
async function applyMonthlyStarFee() {
    console.log('💳 [Scheduler] Star 회원 월정액 차감 시작...');
    try {
        const starUsers = await User.find({ membershipTier: 'star' });
        for (const user of starUsers) {
            user.pointBalance -= 100; // 마이너스 허용 (Math.max 없음)
            await user.save();
            console.log(`  → ${user.name}: Star 월정액 -100P (잔액: ${user.pointBalance}P)`);
        }
        console.log(`✅ [Scheduler] Star 월정액 완료: ${starUsers.length}명 처리`);
    } catch (err) {
        console.error('❌ [Scheduler] Star 월정액 오류:', err);
    }
}
cron.schedule('0 0 1 * *', applyMonthlyStarFee, {
    timezone: 'Asia/Seoul'
});

// 💰 [관리자 전용] 사용자 포인트 하사 (충전/차감)
app.patch('/api/admin/users/:id/points', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body; // 양수면 충전, 음수면 차감
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: '대원을 찾을 수 없습니다.' });
        
        user.pointBalance += Number(amount);
        await user.save();
        
        console.log(`🎁 [Admin] ${user.name} 대원에게 ${amount}P 하사 완료 (현재 잔액: ${user.pointBalance}P)`);
        res.json({ message: '포인트 하사가 완료되었습니다.', newBalance: user.pointBalance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ⭐ Star 회원 업그레이드 (1000P 차감 → star 전환)
app.post('/api/me/upgrade-to-star', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        if ((user as any).membershipTier === 'star') return res.status(400).json({ error: '이미 Star 회원입니다.' });
        if (user.pointBalance < 1000) return res.status(400).json({ error: 'Star 승급에는 1000P가 필요합니다.' });
        user.pointBalance -= 1000;
        (user as any).membershipTier = 'star';
        await user.save();
        res.json({ message: '⭐ Star 회원으로 승급되었습니다!', membershipTier: 'star', newPointBalance: user.pointBalance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Public: View Active Missions (어드민이 생성한 미션 템플릿 목록)
app.get('/api/missions', async (req: Request, res: Response) => {
    try {
        const missions = await Mission.find({ status: 'admin_created' }).sort({ createdAt: -1 });
        res.json(missions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Static Files & Frontend Routing ─────────────────────────
console.log('📂 정적 파일 서빙 설정 중...');
const distPath = path.join(__dirname, '../dist');

// Serve static files
app.use(express.static(distPath));

// Handle client-side routing
// Express 5 compatibility: Use a catch-all middleware instead of problematic path patterns
app.use((req: Request, res: Response) => {
    // API 요청은 미들웨어를 통과했으므로 이미 처리되었거나 404여야 함
    // 그 외 모든 요청(HTML5 History Mode)을 index.html로 리다이렉트
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            res.status(404).send('Frontend build (index.html) not found. Please check build logs.');
        }
    });
});

console.log('🚀 app.listen 호출 직전...');
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📅 대여 페널티 스케줄러 활성화 (매일 자정 Korea Standard Time)');
});
