import React, { useState } from 'react';
import { ExpenseSplit, SplitType } from '@/lib/types';

interface MemberOption {
  identifier: string;
  name: string;
}

interface ExpenseFormProps {
  onAdd: (expense: any) => void;
  members: MemberOption[];
  defaultSplitType: SplitType;
  defaultMemberValues: Record<string, string>;
  initialExpense?: unknown[];
  onClose?: () => void;
}

const categoryKeywords: { category: string; keywords: string[] }[] = [
  { category: 'Fuel', keywords: ['petrol', 'gasoline', 'diesel', 'fuel', 'gas station'] },
  { category: 'Restaurant', keywords: ['lunch', 'dinner', 'breakfast', 'meal', 'restaurant', 'restarant', 'cafe', 'coffee', 'food'] },
  { category: 'Hotel', keywords: ['hotel', 'airbnb', 'room', 'accommodation', 'stay', 'resort'] },
  { category: 'Rent', keywords: ['rent', 'apartment', 'house'] },
  { category: 'Flight', keywords: ['flight', 'airfare', 'airport', 'plane', 'boarding'] },
  { category: 'Parking', keywords: ['parking', 'car park'] },
  { category: 'Bus/train', keywords: ['bus', 'train', 'railway', 'metro', 'subway'] },
  { category: 'Insurance', keywords: ['insurance', 'policy'] },
  { category: 'Visa', keywords: ['visa', 'immigration'] },
  { category: 'Groceries', keywords: ['grocery', 'groceries', 'supermarket', 'vegetables'] },
  { category: 'Taxi', keywords: ['taxi', 'cab', 'uber', 'ola'] },
  { category: 'Entry fees', keywords: ['ticket', 'entry', 'museum', 'monument', 'admission'] },
];

const inferCategory = (description: string) => {
  const normalizedDescription = description.toLowerCase();
  return categoryKeywords.find(({ keywords }) => keywords.some(keyword => normalizedDescription.includes(keyword)))?.category || 'Misc';
};

export default function ExpenseForm({ onAdd, members, defaultSplitType, defaultMemberValues, initialExpense, onClose }: ExpenseFormProps) {
  const initialSplit = typeof initialExpense?.[6] === 'string' && initialExpense[6].startsWith('{')
    ? JSON.parse(initialExpense[6]) as ExpenseSplit
    : null;
  const initialValue = (index: number, fallback: string) => initialExpense?.[index] == null ? fallback : String(initialExpense[index]);
  const [description, setDescription] = useState(initialValue(1, ''));
  const [amount, setAmount] = useState(initialValue(2, ''));
  const [currency, setCurrency] = useState(initialValue(3, 'INR'));
  const [category, setCategory] = useState(initialValue(5, 'Misc'));
  const [isCategoryManual, setIsCategoryManual] = useState(Boolean(initialExpense));
  const [date, setDate] = useState(initialValue(0, new Date().toISOString()).split('T')[0]);
  const [payer, setPayer] = useState(initialValue(4, members.find(m => m.identifier === JSON.parse(localStorage.getItem('user') || '{}').identifier)?.name || members[0]?.name || ''));
  const [splitType, setSplitType] = useState<SplitType>(initialSplit?.splitType || defaultSplitType);
  const [includedMembers, setIncludedMembers] = useState<string[]>(initialSplit?.includedMembers || members.map(member => member.identifier));
  const [memberValues, setMemberValues] = useState<Record<string, string>>(() => ({
    ...defaultMemberValues,
    ...(initialSplit?.memberValues || {}),
  } as Record<string, string>));
  const categoryIcons: Record<string, string> = {
    Misc: '⋯',
    Fuel: '⛽',
    Restaurant: '🍴',
    Hotel: '⌂',
    Rent: '⌂',
    Flight: '✈',
    Parking: 'P',
    'Bus/train': '▣',
    Insurance: '✚',
    Visa: 'V',
    Groceries: '🛒',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please enter a valid description.');
      return;
    }
    if (includedMembers.length === 0) {
      alert('Include at least one traveller in the split.');
      return;
    }
    onAdd({
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      category,
      date,
      payer,
      split: {
        includedMembers,
        splitType: includedMembers.length > 1 ? splitType : 'equal',
        memberValues
      }
    });
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (!isCategoryManual) setCategory(inferCategory(value));
  };

  return (
    <form className="card expense-form expense-composer" onSubmit={handleSubmit}>
      <div className="expense-form-header">
        <button type="button" className="expense-form-close" aria-label="Close expense form" onClick={onClose}>×</button>
        <h3>{initialExpense ? 'Edit an expense' : 'Add an expense'}</h3>
        <button type="submit" className="expense-form-save">Save</button>
      </div>
      <div className="expense-form-fields">
        <input
          type="text"
          placeholder="Description"
          aria-label="Expense description"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          required
        />
        <div className="expense-amount-field">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
            <option value="INR">₹</option>
            <option value="USD">$</option>
            <option value="EUR">€</option>
          </select>

          <input
            type="number"
            placeholder="Amount"
            aria-label="Expense amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ flex: 1 }}
            required
          />
        </div>
        <div className="expense-category-field">
          <span className="expense-form-category-icon">{categoryIcons[category] || categoryIcons.Misc}</span>
          <select value={category} onChange={(e) => { setIsCategoryManual(true); setCategory(e.target.value); }} aria-label="Expense category">
            <option value="Misc">Misc</option>
            <option value="Fuel">Fuel</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Hotel">Hotel</option>
            <option value="Rent">Rent</option>
            <option value="Flight">Flight</option>
            <option value="Parking">Parking</option>
            <option value="Bus/train">Bus/train</option>
            <option value="Insurance">Insurance</option>
            <option value="Visa">Visa</option>
            <option value="Groceries">Groceries</option>
            <option value="Taxi">Taxi</option>
          </select>
        </div>
        <label className="expense-form-date">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label htmlFor="expense-payer" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <strong>Who paid?</strong>
          <select id="expense-payer" value={payer} onChange={(e) => setPayer(e.target.value)} required>
            {members.map(member => (
              <option key={member.identifier} value={member.name}>{member.name}</option>
            ))}
          </select>
        </label>
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          <strong>Who shares this expense?</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {members.map(member => {
              const included = includedMembers.includes(member.identifier);
              return (
                <label key={member.identifier} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => setIncludedMembers(current => included
                      ? current.filter(id => id !== member.identifier)
                      : [...current, member.identifier])}
                    style={{ width: 'auto' }}
                  />
                  <span>{member.name}</span>
                  {member.identifier === members[0]?.identifier && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>(you)</span>}
                </label>
              );
            })}
          </div>
        </div>
        {includedMembers.length > 1 && (
          <>
            <select value={splitType} onChange={(e) => setSplitType(e.target.value as SplitType)}>
              <option value="equal">Equal split</option>
              <option value="percentage">Percentage split</option>
              <option value="share">Share split</option>
            </select>
            {splitType !== 'equal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.filter(member => includedMembers.includes(member.identifier)).map(member => (
                  <label key={member.identifier} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ flex: 1 }}>{member.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={splitType === 'percentage' ? '%' : 'Shares'}
                      value={memberValues[member.identifier] || ''}
                      onChange={(e) => setMemberValues({ ...memberValues, [member.identifier]: e.target.value })}
                      style={{ width: '100px' }}
                      required
                    />
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </form>
  );
}
