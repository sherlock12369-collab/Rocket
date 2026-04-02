import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.ts';

dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) { console.error('No URI'); process.exit(1); }

const broadcastNotification = async (message: string, type: string = 'info') => {
    try {
        const result = await User.updateMany({}, {
            $push: {
                notifications: {
                    message,
                    type,
                    createdAt: new Date(),
                    read: false
                }
            }
        });
        console.log(`📢 [Broadcast Test] Sent to ${result.modifiedCount} users.`);
    } catch (err) {
        console.error('Broadcast Error:', err);
    }
};

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await broadcastNotification("🛰️ [테스트] 함선 전체 통신 시스템이 정상 작동 중입니다. 이 메시지가 보이면 성공입니다!", "success");
    process.exit(0);
  });
