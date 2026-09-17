import { NextResponse } from 'next/server';
import { deleteSheetRow } from '@/lib/googleSheets';

export async function POST(request: Request) {
  const { sheetTitle, rowIndex } = await request.json();

  try {
    await deleteSheetRow(sheetTitle, rowIndex);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
