import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.ts';
import Product from './models/Product.ts';
import Order from './models/Order.ts';
import Mission from './models/Mission.ts';

dotenv.config({ path: '.env.local' });

const OLD_URI = 'mongodb+srv://hlee0127_db_user:nC6ZoBuI7EV0Ua1U@cluster0.glgnust.mongodb.net/rocket?retryWrites=true&w=majority&appName=Cluster0';
// NEW_URI from user (nkx31k3) with confirmed password and database name
const CLOUD_URI = 'mongodb+srv://sherlock12369_db_user:rocket1234@cluster0.nkx31k3.mongodb.net/rocket?retryWrites=true&w=majority&appName=Cluster0';

if (!CLOUD_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
}

async function migrate() {
    try {
        console.log('📡 [Old Cluster] 연결 시도 중...');
        const localConn = await mongoose.createConnection(OLD_URI).asPromise();
        console.log('✅ [Old Cluster] 연결 성공');

        console.log('📡 [Cloud] 연결 시도 중...');
        const cloudConn = await mongoose.createConnection(CLOUD_URI).asPromise();
        console.log('✅ [Cloud] 연결 성공');

        const LocalUser = localConn.model('User', User.schema);
        const LocalProduct = localConn.model('Product', Product.schema);
        const LocalOrder = localConn.model('Order', Order.schema);
        const LocalMission = localConn.model('Mission', Mission.schema);

        const CloudUser = cloudConn.model('User', User.schema);
        const CloudProduct = cloudConn.model('Product', Product.schema);
        const CloudOrder = cloudConn.model('Order', Order.schema);
        const CloudMission = cloudConn.model('Mission', Mission.schema);

        // 1. Migrate Products
        console.log('📦 상품 이관 시작...');
        const products = await LocalProduct.find();
        for (const p of products) {
            const plain = p.toObject();
            delete plain._id;
            await CloudProduct.findOneAndUpdate({ title: plain.title }, plain, { upsert: true });
        }
        console.log(`✅ 상품 ${products.length}개 이관 완료`);

        // 2. Migrate Missions
        console.log('🎯 미션 이관 시작...');
        const missions = await LocalMission.find();
        for (const m of missions) {
            const plain = m.toObject();
            delete plain._id;
            await CloudMission.create(plain);
        }
        console.log(`✅ 미션 ${missions.length}개 이관 완료`);

        // 3. Migrate Users (Excluding admin if already exists)
        console.log('👥 사용자 이관 시작...');
        const users = await LocalUser.find();
        for (const u of users) {
            const plain = u.toObject();
            const exists = await CloudUser.findOne({ username: plain.username });
            if (!exists) {
                delete plain._id;
                await CloudUser.create(plain);
            }
        }
        console.log(`✅ 사용자 이관 완료`);

        console.log('🎉 모든 데이터가 클라우드로 복사되었습니다!');

        await localConn.close();
        await cloudConn.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ 마이그레이션 실패:', err);
        process.exit(1);
    }
}

migrate();
