import { NextResponse } from 'next/server';
import { getSheetData, appendSheetRow } from '../../../../lib/googleSheets';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const { identifier, password, name } = await request.json();
  
  try {
    // 1. Move to Users sheet: [Identifier, Password, Name, IsAdmin(false)]
    await appendSheetRow('Users', [[identifier, password, name, 'FALSE']]);
    
    // 2. Remove from PendingUsers sheet (Overwrite method)
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    const allPending = await getSheetData('PendingUsers');
    const updatedPending = allPending?.filter((row: string[]) => row[0] !== identifier);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'PendingUsers!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: updatedPending || [] },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to approve user:', error);
    return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 });
  }
}
