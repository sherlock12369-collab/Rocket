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

// Load environment variables (.env.local for local, .env or system env for production)
dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
    dotenv.config();
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'rocket-secret-key';

app.use(express.json({ limit: '10mb' }));
app.use(cors());

mongoose.connect(process.env.MONGODB_URI!)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err: any) => console.error('MongoDB error:', err));

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
        res.json({ token, user: { id: user._id, name: user.name, role: user.role, pointBalance: user.pointBalance } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Products: Public List
app.get('/api/products', async (req: Request, res: Response) => {
    try {
        const items = await Product.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Products: Update (Admin)
app.patch('/api/products/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, description, price, category, stock, type, image } = req.body;
    try {
        const product = await Product.findByIdAndUpdate(
            id,
            { title, description, price, category, stock, type, image },
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
        res.json({ user, orders });
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

        // ⭐ Star 혜택: 배송비 면제 (일반 회원 = +50P)
        const shippingFee = isStar ? 0 : 50;
        const finalPrice = basePrice + shippingFee;

        if (user.pointBalance < finalPrice) return res.status(400).json({ error: '포인트가 부족합니다.' });

        user.pointBalance -= finalPrice;
        await user.save();

        const order = new Order({ userId: req.user.id, items, totalPrice: finalPrice, status: 'pending' });
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
        res.json({ message: '반납/반품 요청이 접수되었습니다. 지휘관의 확인 후 처리됩니다.' });
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
        await user.save();
        res.json({ message: '포인트가 업데이트되었습니다.', pointBalance: user.pointBalance });
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

// Admin: List Orders
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const items = await Order.find().populate('userId', 'name username').sort({ createdAt: -1 });
        res.json(items);
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
        // fulfilled 전환 시: rent 아이템이 있으면 rentedAt 기록 (반납 기한 산정 기준)
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
                }
                if (refundAmount > 0) { user.pointBalance += refundAmount; await user.save(); }
            }
            for (const item of order.items as any[]) {
                if (!item.productId) continue;
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity || 1 } });
            }
        }
        await order.save();
        res.json({ message: `주문 상태가 '${status}'(으)로 변경되었습니다.`, order });
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
// Serve static files from the frontend build directory
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle client-side routing: return index.html for any request that doesn't match an API route
app.get('/*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📅 대여 페널티 스케줄러 활성화 (매일 자정 Korea Standard Time)');
});
