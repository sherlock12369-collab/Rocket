import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username.'],
        unique: true,
        maxlength: [20, 'Username cannot be more than 20 characters'],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password.'],
    },
    plainPassword: {
        type: String,
    },
    name: {
        type: String,
        required: [true, 'Please provide a name.'],
        maxlength: [20, 'Name cannot be more than 20 characters'],
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user',
    },
    pointBalance: {
        type: Number,
        default: 0,
    },
    membershipTier: {
        type: String,
        enum: ['normal', 'star'],
        default: 'normal',
    },
    avatar: {
        type: String,
        default: '/avatars/default.png',
    },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
