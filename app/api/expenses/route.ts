import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/googleSheets';

export async function GET() {
  try {
    const data = await getSheetData('Expenses!A:H');
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
