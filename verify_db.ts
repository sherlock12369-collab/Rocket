import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.ts';
import Product from './models/Product.ts';
import Order from './models/Order.ts';

dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) { console.error('No URI'); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
        console.log('Ensuring indexes...');
        await Product.createIndexes();
        await Order.createIndexes();
        console.log('Indexes created successfully.');
        
        // Test sort memory issue
        const items = await Product.find({}).sort({ createdAt: -1 }).limit(10).lean();
        console.log(`[VERIFY] Successfully fetched ${items.length} products with sort.`);
    } catch (err: any) {
        console.error('[VERIFY] CRASHED:', err.message);
    }
    process.exit(0);
  });
