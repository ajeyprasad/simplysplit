import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSheetData } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
  const { sheetTitle, members, splitType, memberValues } = await request.json();
  
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const allGroups = await getSheetData('Groups');
    const rowIndex = allGroups ? allGroups.findIndex((row: string[]) => row[0] === sheetTitle) : -1;

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Update row data: [SheetTitle, Creator, Members, SplitType, MemberValues]
    const updatedRow = [
      allGroups![rowIndex][0], // Keep SheetTitle
      allGroups![rowIndex][1], // Keep Creator
      members.join(','),
      splitType,
      JSON.stringify(memberValues)
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Groups!A${rowIndex + 1}:E${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}
