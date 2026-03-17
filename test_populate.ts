import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) { console.error('No URI'); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
        const UserSchema = new mongoose.Schema({}, { strict: false });
        // const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const ProductSchema = new mongoose.Schema({
            title: String,
            sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
        }, { strict: false });
        const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
        
        const items = await Product.find().populate('sellerId', 'name username').lean();
        console.log(`Successfully populated ${items.length} items. First item title: ${items[0]?.title}`);
    } catch (err: any) {
        console.error('POPULATE CRASHED:', err.message);
    }
    process.exit(0);
  });
