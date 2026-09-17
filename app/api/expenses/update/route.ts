import { NextResponse } from 'next/server';
import { updateSheetRow } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
  const { sheetTitle, rowIndex, values } = await request.json();

  try {
    // Keep the split configuration in column G; H is intentionally outside the stored row.
    await updateSheetRow(sheetTitle, `A${rowIndex}:G${rowIndex}`, [values]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}
