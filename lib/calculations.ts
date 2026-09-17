import { Expense, ExpenseSplit, UserBalance } from './types';

export const calculateSplitDetails = (amount: number, split: ExpenseSplit) => {
  const includedMembers = split.includedMembers;
  if (includedMembers.length === 0) return [];

  if (split.splitType === 'equal') {
    const share = amount / includedMembers.length;
    return includedMembers.map(userId => ({ userId, amount: share }));
  }

  const rawValues = includedMembers.map(userId => Math.max(0, Number(split.memberValues[userId] || 0)));
  const totalValue = rawValues.reduce((total, value) => total + value, 0);
  if (totalValue === 0) {
    const share = amount / includedMembers.length;
    return includedMembers.map(userId => ({ userId, amount: share }));
  }

  return includedMembers.map((userId, index) => ({
    userId,
    amount: amount * (rawValues[index] / totalValue),
  }));
};

export const calculateExpenseShare = (amount: number, userId: string, split: ExpenseSplit) =>
  calculateSplitDetails(amount, split).find(detail => detail.userId === userId)?.amount || 0;

export const calculateBalances = (expenses: Expense[], userIds: string[]): UserBalance[] => {
  const balances: Record<string, number> = Object.fromEntries(userIds.map(id => [id, 0]));

  expenses.forEach(expense => {
    // Payer is owed the total amount
    balances[expense.payerId] += expense.amount;

    // Use the expense override when present; legacy expenses keep their stored details.
    const splitDetails = expense.split
      ? calculateSplitDetails(expense.amount, expense.split)
      : expense.splitDetails;
    splitDetails.forEach(detail => {
      balances[detail.userId] -= detail.amount;
    });
  });

  return Object.entries(balances).map(([userId, amount]) => ({ userId, amount }));
};
