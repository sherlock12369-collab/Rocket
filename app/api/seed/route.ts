import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
    await dbConnect();

    try {
        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            return NextResponse.json({ message: 'Admin already exists', admin: adminExists.username });
        }

        const hashedPassword = await bcrypt.hash('rocket1234', 10); // Default password

        const adminUser = await User.create({
            username: 'sherlock',
            password: hashedPassword,
            name: 'Sherlock (Admin)',
            role: 'admin',
            pointBalance: 1000, // Initial points for admin
        });

        return NextResponse.json({ message: 'Admin created successfully', user: adminUser });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
