import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.MONGODB_URI) dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) { console.error('No MONGODB_URI'); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const ProductSchema = new mongoose.Schema({ sellerId: mongoose.Schema.Types.Mixed }, { strict: false });
    const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
    
    const products = await Product.find({}).lean();
    let issues = 0;
    for (const p of products) {
        if (p.sellerId !== undefined && p.sellerId !== null) {
            if (!(p.sellerId instanceof mongoose.Types.ObjectId)) {
                console.log(`Product ${p._id} has invalid sellerId:`, p.sellerId, 'type:', typeof p.sellerId);
                issues++;
            }
        }
    }
    console.log(`Found ${issues} products with invalid sellerId.`);
    process.exit(0);
  });
