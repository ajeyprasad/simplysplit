import { NextResponse } from 'next/server';
import { getSheetData } from '../../../../lib/googleSheets';

export async function POST(request: Request) {
  const { identifier } = await request.json();
  
  try {
    const groups = await getSheetData('Groups');
    // Schema: [GroupName, CreatorIdentifier, Members(comma-separated), SplitType, MemberValues]
    // Filter groups where the user is either the creator (col 1) or in the members list (col 2)
    const userGroups = groups?.filter((row: string[]) => {
      const creator = row[1];
      const members = row[2]?.split(',');
      return creator === identifier || members?.includes(identifier);
    }).map(row => row[0]) || [];
    
    return NextResponse.json({ groups: userGroups });
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
