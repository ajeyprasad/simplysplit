import { NextResponse } from 'next/server';
import { getSheetData } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
  const { sheetTitle } = await request.json();
  
  try {
    const groups = await getSheetData('Groups');
    // Schema: [GroupName(unique), CreatorIdentifier, Members(comma-separated), SplitType, MemberValues(JSON)]
    const group = groups?.find((row: string[]) => row[0] === sheetTitle);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      group: {
        name: group[0],
        creator: group[1],
        members: group[2]?.split(',') || [],
        splitType: group[3],
        memberValues: JSON.parse(group[4] || '{}')
      }
    });
  } catch (error) {
    console.error('Failed to fetch group details:', error);
    return NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 });
  }
}
