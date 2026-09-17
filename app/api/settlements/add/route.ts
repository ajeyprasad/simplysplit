import { NextResponse } from 'next/server';
import { appendSheetRow } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
    const { sheetTitle, from, to, amount, currency, date } = await request.json();
    if (!sheetTitle || !from || !to || from === to || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        return NextResponse.json({ error: 'Invalid settlement' }, { status: 400 });
    }

    try {
        await appendSheetRow(sheetTitle, [['SETTLEMENT', date, from, to, Number(amount), currency || 'INR']]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to add settlement:', error);
        return NextResponse.json({ error: 'Failed to add settlement' }, { status: 500 });
    }
}