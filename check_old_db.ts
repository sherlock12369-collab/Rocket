import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.ts';
import Product from './models/Product.ts';
import Mission from './models/Mission.ts';

dotenv.config({ path: '.env.local' });

// Old cluster from .env.local
const OLD_URI = 'mongodb+srv://hlee0127_db_user:nC6ZoBuI7EV0Ua1U@cluster0.glgnust.mongodb.net/rocket?retryWrites=true&w=majority&appName=Cluster0';
// New cluster (the one currently being used)
const NEW_URI = process.env.MONGODB_URI;

async function checkOldData() {
    try {
        console.log('📡 [Old Cluster] 연결 시도 중...');
        const oldConn = await mongoose.createConnection(OLD_URI).asPromise();
        console.log('✅ [Old Cluster] 연결 성공');

        const OldProduct = oldConn.model('Product', Product.schema);
        const OldMission = oldConn.model('Mission', Mission.schema);
        const OldUser = oldConn.model('User', User.schema);

        const pCount = await OldProduct.countDocuments();
        const mCount = await OldMission.countDocuments();
        const uCount = await OldUser.countDocuments();

        console.log(`📊 데이터 현황: 상품(${pCount}), 미션(${mCount}), 사용자(${uCount})`);

        if (pCount > 0) {
            const sample = await OldProduct.findOne();
            console.log('📦 상품 샘플:', sample?.title);
        }

        await oldConn.close();
    } catch (err) {
        console.error('❌ 접속 실패:', err);
    }
}

checkOldData();
