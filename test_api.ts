import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.ts';
import Product from './models/Product.ts';

dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) { console.error('No URI'); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
        const items = await Product.find().populate('sellerId', 'name username').sort({ createdAt: -1 });
        console.log(`[API MOCK] Found ${items.length} products with admin populate.`);
        if (items.length > 0) console.log(items[0]);
    } catch (err: any) {
        console.error('[API MOCK] CRASHED:', err.message);
    }
    process.exit(0);
  });
