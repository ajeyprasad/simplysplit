import { NextResponse } from 'next/server';
import { getSheetData } from '../../../../lib/googleSheets';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

// SECURITY WARNING: Storing user credentials (even hashed) in a Google Sheet 
// is highly discouraged for production applications due to security and privacy risks.

export async function POST(request: Request) {
  const { identifier, password } = await request.json();

  try {
    const users = await getSheetData('Users');
    
    if (!users) {
      return NextResponse.json({ error: 'System error: No users found' }, { status: 500 });
    }
    
    // Check against column 0 (Email/Username)
    const user = users?.find((row: string[]) => row[0].trim() === identifier.trim());

    if (user) {
      const isMatch = await bcrypt.compare(password, user[1]);
      if (isMatch) {
        const token = await signToken({ identifier: user[0], name: user[2], isAdmin: user[3]?.toUpperCase() === 'TRUE' });
        
        const response = NextResponse.json({ 
          success: true, 
          user: { 
            identifier: user[0], 
            name: user[2], 
            isAdmin: user[3]?.toUpperCase() === 'TRUE' 
          } 
        });

        response.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
      }
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
