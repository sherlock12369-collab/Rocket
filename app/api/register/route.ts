import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { username, password, name } = await req.json();

        if (!username || !password || !name) {
            return NextResponse.json(
                { message: 'All fields are required.' },
                { status: 400 }
            );
        }

        await dbConnect();

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return NextResponse.json(
                { message: 'Username already exists.' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            password: hashedPassword,
            name,
            role: 'user', // Default role is user
            pointBalance: 0, // Default points
            avatar: '/avatars/default.png'
        });

        return NextResponse.json({ message: 'User registered successfully.' }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { message: 'An error occurred while registering the user.', error: error.message },
            { status: 500 }
        );
    }
}
