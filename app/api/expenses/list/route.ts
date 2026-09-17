import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/googleSheets';

export async function POST(request: Request) {
  const { sheetTitle } = await request.json();

  try {
    const expenses = await getSheetData(sheetTitle);
    const rowsWithIndex = expenses
      ? expenses
        .map((row: unknown[], index: number) => [...row, index + 1])
        .filter(row => row.slice(0, -1).some(value => value !== undefined && String(value).trim() !== ''))
      : [];
    const settlements = rowsWithIndex
      .filter(row => row[0] === 'SETTLEMENT')
      .map(row => ({ date: String(row[1] || ''), from: String(row[2] || ''), to: String(row[3] || ''), amount: Number(row[4] || 0), currency: String(row[5] || 'INR'), rowIndex: Number(row[row.length - 1]) }));
    const expensesWithIndex = rowsWithIndex.filter(row => row[0] !== 'SETTLEMENT');
    return NextResponse.json({ expenses: expensesWithIndex, settlements });
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
