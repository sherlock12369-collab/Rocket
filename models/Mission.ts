import mongoose from 'mongoose';

const MissionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    proofText: { type: String },
    proofImage: { type: String }, // Base64 or URL
    rewardPoints: { type: Number, required: true, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'admin_created'],
        default: 'pending',
    },
}, { timestamps: true });

export default mongoose.models.Mission || mongoose.model('Mission', MissionSchema);
