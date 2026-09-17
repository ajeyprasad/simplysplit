import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSheetData, updateSheetRow } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
    const { identifier, currentPassword, newPassword } = await request.json();
    if (!identifier || !currentPassword || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Valid password details are required' }, { status: 400 });
    }

    try {
        const users = await getSheetData('Users');
        const userIndex = users?.findIndex((row: string[]) => row[0] === identifier) ?? -1;
        if (userIndex < 0 || !users?.[userIndex]) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const user = users[userIndex];
        if (!(await bcrypt.compare(currentPassword, user[1] || ''))) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateSheetRow('Users', `A${userIndex + 1}:D${userIndex + 1}`, [[user[0], hashedPassword, user[2], user[3]]]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to change password:', error);
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
    }
}
