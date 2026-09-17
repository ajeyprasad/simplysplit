export type Category =
  | 'Fuel' | 'Restaurant' | 'Hotel' | 'Rent' | 'Flight' | 'Parking'
  | 'Entry fees' | 'Misc' | 'Groceries' | 'Insurance' | 'Visa' | 'Bus/train' | 'Taxi';

export type Currency = 'INR' | 'USD' | 'EUR';

export type SplitType = 'equal' | 'percentage' | 'share';

export interface ExpenseSplit {
  includedMembers: string[];
  splitType: SplitType;
  memberValues: Record<string, string | number>;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  category: Category;
  payerId: string;
  splitDetails: { userId: string; amount: number }[];
  split?: ExpenseSplit;
}

export interface UserBalance {
  userId: string;
  amount: number; // Positive if owed, negative if owes
}
