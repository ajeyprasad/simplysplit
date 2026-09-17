import { NextResponse } from 'next/server';
import { appendSheetRow } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
  const { sheetTitle, description, amount, currency, payer, category, date, split } = await request.json();

  try {
    // Append expense to group sheet: [Date, Description, Amount, Currency, Payer, Category, Split]
    await appendSheetRow(sheetTitle, [[date, description, amount, currency, payer, category, JSON.stringify(split)]]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add expense:', error);
    return NextResponse.json({ error: 'Failed to add expense' }, { status: 500 });
  }
}
