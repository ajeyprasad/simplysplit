import { NextResponse } from 'next/server';
import { getSheetData } from '../../../../lib/googleSheets';

export async function GET() {
  try {
    const pendingUsers = await getSheetData('PendingUsers');
    return NextResponse.json({ pendingUsers: pendingUsers || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 });
  }
}
