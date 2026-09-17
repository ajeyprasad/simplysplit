import { NextResponse } from 'next/server';
import { updateSheetRow } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
    const { sheetTitle, rowIndex, from, to, amount, currency, date } = await request.json();
    if (!sheetTitle || !rowIndex || !from || !to || from === to || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        return NextResponse.json({ error: 'Invalid settlement' }, { status: 400 });
    }

    try {
        await updateSheetRow(sheetTitle, `A${rowIndex}:F${rowIndex}`, [['SETTLEMENT', date, from, to, Number(amount), currency || 'INR']]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update settlement:', error);
        return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
    }
}