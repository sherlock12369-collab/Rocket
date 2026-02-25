import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.ts';
import Mission from './models/Mission.ts';

dotenv.config({ path: '.env.local' });

const CLOUD_URI = 'mongodb+srv://sherlock12369_db_user:rocket1234@cluster0.nkx31k3.mongodb.net/rocket?retryWrites=true&w=majority&appName=Cluster0';

async function verify() {
    try {
        console.log('📡 [New Cluster] 접속 확인 중...');
        await mongoose.connect(CLOUD_URI!);
        console.log('✅ [New Cluster] 접속 성공');

        const pCount = await Product.countDocuments();
        const mCount = await Mission.countDocuments();

        console.log(`📊 현재 클라우드 데이터 현황: 상품(${pCount}개), 미션(${mCount}개)`);

        if (pCount > 0) {
            const products = await Product.find().limit(3);
            console.log('📦 복구된 상품 목록:', products.map(p => p.title).join(', '));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ 검증 실패:', err);
    }
}

verify();
