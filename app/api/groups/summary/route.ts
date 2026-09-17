import { NextResponse } from 'next/server';
import { getSheetData } from '../../../../lib/googleSheets';
import { calculateSplitDetails } from '../../../../lib/calculations';
import { ExpenseSplit } from '../../../../lib/types';

export async function POST(request: Request) {
    const { identifier } = await request.json();

    try {
        const groups = await getSheetData('Groups');
        const users = await getSheetData('Users') || [];
        const identifierFor = (value: unknown) => {
            const text = String(value || '');
            if (users.some(row => row[0] === text)) return text;
            return users.find(row => row[2] === text)?.[0] || text;
        };
        const userGroups = groups?.filter((row: string[]) => {
            const members = row[2]?.split(',') || [];
            return row[1] === identifier || members.includes(identifier);
        }) || [];

        const summaries = await Promise.all(userGroups.map(async row => {
            const sheetTitle = row[0];
            const members = row[2]?.split(',') || [];
            const groupSplit = {
                splitType: row[3] || 'equal',
                memberValues: JSON.parse(row[4] || '{}'),
            };
            const rows = await getSheetData(sheetTitle) || [];
            const balances: Record<string, Record<string, number>> = {};

            const addBalance = (currency: string, userId: string, amount: number) => {
                balances[currency] = balances[currency] || {};
                balances[currency][userId] = (balances[currency][userId] || 0) + amount;
            };

            rows.forEach((expense: any[]) => {
                if (expense[0] === 'SETTLEMENT') {
                    const currency = String(expense[5] || 'INR');
                    addBalance(currency, identifierFor(expense[2]), Number(expense[4] || 0));
                    addBalance(currency, identifierFor(expense[3]), -Number(expense[4] || 0));
                    return;
                }
                if (!expense[0] && !expense[1] && !expense[2]) return;
                const amount = Number(expense[2] || 0);
                const currency = String(expense[3] || 'INR');
                const payer = identifierFor(expense[4]);
                addBalance(currency, payer, amount);
                let split: ExpenseSplit;
                try {
                    split = typeof expense[6] === 'string' && expense[6].startsWith('{')
                        ? JSON.parse(expense[6])
                        : { includedMembers: members, splitType: groupSplit.splitType as ExpenseSplit['splitType'], memberValues: groupSplit.memberValues };
                } catch {
                    split = { includedMembers: members, splitType: groupSplit.splitType as ExpenseSplit['splitType'], memberValues: groupSplit.memberValues };
                }
                calculateSplitDetails(amount, split).forEach(detail => addBalance(currency, detail.userId, -detail.amount));
            });

            return {
                group: sheetTitle,
                net: Object.fromEntries(Object.entries(balances).map(([currency, values]) => [currency, values[identifier] || 0])),
            };
        }));

        return NextResponse.json({ summaries });
    } catch (error) {
        console.error('Failed to calculate group summaries:', error);
        return NextResponse.json({ error: 'Failed to calculate group summaries' }, { status: 500 });
    }
}
