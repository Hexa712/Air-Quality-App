import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), '.otp-store.json');

function getOTP(email: string) {
    if (!fs.existsSync(STORE_PATH)) return null;
    try {
        const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
        return store[email.toLowerCase()] || null;
    } catch (e) {
        return null;
    }
}

function deleteOTP(email: string) {
    if (!fs.existsSync(STORE_PATH)) return;
    try {
        const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
        delete store[email.toLowerCase()];
        fs.writeFileSync(STORE_PATH, JSON.stringify(store));
    } catch (e) {}
}

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        const data = getOTP(email);

        if (!data) {
            return NextResponse.json({ error: 'Verification code not found or expired.' }, { status: 400 });
        }

        if (Date.now() > data.expiresAt) {
            deleteOTP(email);
            return NextResponse.json({ error: 'Verification code expired.' }, { status: 400 });
        }

        if (data.code !== code) {
            return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
        }

        // Success!
        deleteOTP(email);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error verifying OTP:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
