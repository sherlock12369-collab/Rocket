import mongoose from 'mongoose';

const AuctionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    startingBid: { type: Number, required: true, default: 0 },
    currentBid: { type: Number, required: true, default: 0 },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' }
}, { timestamps: true });

export default mongoose.models.Auction || mongoose.model('Auction', AuctionSchema);
