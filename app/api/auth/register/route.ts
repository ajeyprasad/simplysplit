import { NextResponse } from 'next/server';
import { appendSheetRow } from '../../../../lib/googleSheets';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const { identifier, name, password } = await request.json();
  console.log('Registering user:', identifier);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed');

    // Append to 'PendingUsers' sheet: [Identifier, HashedPassword, Name]
    await appendSheetRow('PendingUsers', [[identifier, hashedPassword, name]]);
    console.log('User appended to PendingUsers');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Failed to register', details: String(error) }, { status: 500 });
  }
}
