import { NextResponse } from 'next/server';
import { appendSheetRow } from '../../../lib/googleSheets';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const { groupName, creatorIdentifier, members, splitType, memberValues } = await request.json();
  const sheetTitle = `${creatorIdentifier}-${groupName}`;
  
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // Validate uniqueness: check if sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
    if (spreadsheet.data.sheets?.some(s => s.properties?.title === sheetTitle)) {
      return NextResponse.json({ error: 'Group with this name already exists' }, { status: 400 });
    }

    // 1. Create a new sheet (tab) for the group's expenses
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: sheetTitle }
          }
        }]
      }
    });

    // 2. Append group metadata to 'Groups' sheet
    await appendSheetRow('Groups', [[sheetTitle, creatorIdentifier, members.join(','), splitType, JSON.stringify(memberValues)]]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
