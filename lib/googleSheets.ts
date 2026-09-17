import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export const getSheetData = async (sheetName: string, range: string = 'A:Z') => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return response.data.values;
};

export const appendSheetRow = async (sheetName: string, values: any[][]) => {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!A1:Z1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
};

export const updateSheetRow = async (sheetName: string, range: string, values: any[][]) => {
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
};

export const deleteSheetRow = async (sheetName: string, rowIndex: number) => {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find(item => item.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId) throw new Error(`Sheet not found: ${sheetName}`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: Number(rowIndex) - 1,
            endIndex: Number(rowIndex),
          },
        },
      }],
    },
  });
};
