import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/googleSheets';

export async function GET() {
  try {
    const users = await getSheetData('Users');
    // Assuming Users sheet: [Email, HashedPassword, Name, IsAdmin]
    // Filter out Admin (row[3] === 'TRUE')
    const regularUsers = users?.filter((row: string[]) => row[3]?.toUpperCase() !== 'TRUE')
                                .map((row: string[]) => ({ identifier: row[0], name: row[2] }));
    
    return NextResponse.json({ users: regularUsers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
