'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import BalanceCard from '@/components/BalanceCard';
import SettlementList from '@/components/SettlementList';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseChart from '@/components/ExpenseChart';
import { calculateExpenseShare, calculateSplitDetails } from '@/lib/calculations';
import { ExpenseSplit, SplitType } from '@/lib/types';
import { formatAmount, formatCurrency, formatRate } from '@/lib/formatting';
import ProfileMenu from '@/components/ProfileMenu';

export default function GroupPage() {
  const params = useParams();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<{ identifier: string; name: string } | null>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings / Group Edit State
  const [availableUsers, setAvailableUsers] = useState<{ identifier: string; name: string }[]>([]);
  const [editMembers, setEditMembers] = useState<{ identifier: string; name: string }[]>([]);
  const [editSplitType, setEditSplitType] = useState('equal');
  const [editMemberValues, setEditMemberValues] = useState<Record<string, string>>({});

  const [expenses, setExpenses] = useState<string[][]>([]);
  const [currencyTotals, setCurrencyTotals] = useState<Record<string, number>>({});
  const [userShares, setUserShares] = useState<Record<string, number>>({});
  const [userPaid, setUserPaid] = useState<Record<string, number>>({});
  const [recordedSettlements, setRecordedSettlements] = useState<{ date: string; from: string; to: string; amount: number; currency: string; rowIndex: number }[]>([]);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementFrom, setSettlementFrom] = useState('');
  const [settlementTo, setSettlementTo] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementCurrency, setSettlementCurrency] = useState('INR');
  const [editingSettlement, setEditingSettlement] = useState<{ date: string; from: string; to: string; amount: number; currency: string; rowIndex: number } | null>(null);
  const [toast, setToast] = useState('');
  const [editingExpense, setEditingExpense] = useState<string[] | null>(null);
  const [isConversionOpen, setIsConversionOpen] = useState(false);
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});
  const [conversionUpdatedAt, setConversionUpdatedAt] = useState('');
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState('');
  const [conversionApplied, setConversionApplied] = useState(false);
  const [activeDashboardView, setActiveDashboardView] = useState<'expenses' | 'balance' | 'charts'>('expenses');

  useEffect(() => {
    setIsClient(true);
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    fetch('/api/users').then(res => res.json()).then(data => setAvailableUsers(data.users || []));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingExpense(null);
        setIsSettingsOpen(false);
        setIsConversionOpen(false);
        setIsSettlementOpen(false);
        setEditingSettlement(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const decodedGroupName = isClient ? decodeURIComponent(params.groupName as string) : '';

  // Persist conversion preference
  useEffect(() => {
    if (isClient && decodedGroupName) {
      const saved = localStorage.getItem(`simplysplit-convert-to-inr-${decodedGroupName}`);
      if (saved === 'true') {
        setConversionApplied(true);
        if (Object.keys(currencyTotals).length > 0) {
          fetchConversionRates(true);
        }
      }
    }
  }, [isClient, decodedGroupName, currencyTotals]);

  useEffect(() => {
    if (isClient && decodedGroupName) {
      localStorage.setItem(`simplysplit-convert-to-inr-${decodedGroupName}`, String(conversionApplied));
    }
  }, [conversionApplied, isClient, decodedGroupName]);

  const groupCurrency = groupDetails?.currency || 'INR';

  const getExpenseSplit = (expense: string[]): ExpenseSplit => {
    if (typeof expense[6] === 'string' && expense[6].startsWith('{')) {
      return JSON.parse(expense[6]);
    }
    return {
      includedMembers: groupDetails?.members || [],
      splitType: (groupDetails?.splitType || 'equal') as SplitType,
      memberValues: groupDetails?.memberValues || {},
    };
  };

  const fetchGroupDetails = async () => {
    if (!decodedGroupName) return;
    try {
      const res = await fetch('/api/groups/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetTitle: decodedGroupName })
      });
      if (res.ok) {
        const data = await res.json();
        setGroupDetails(data.group);
        setEditSplitType(data.group.splitType);
        setEditMemberValues(data.group.memberValues);
      }
    } catch (err) {
      console.error('Error fetching group details:', err);
    }
  };

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return code;
    }
  };

  const foreignCurrencies = Object.keys(currencyTotals).filter(currency => currency !== 'INR');

  const fetchConversionRates = async (silent = false) => {
    if (foreignCurrencies.length === 0) return;
    setConversionLoading(true);
    setConversionError('');
    try {
      const response = await fetch(`/api/currency?currencies=${foreignCurrencies.join(',')}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to fetch current rates');
      setConversionRates(data.rates || {});
      setConversionUpdatedAt(data.fetchedAt || '');
      setConversionApplied(true);
      if (!silent) setIsConversionOpen(true);
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : 'Unable to fetch current rates');
      if (!silent) setIsConversionOpen(true);
    } finally {
      setConversionLoading(false);
    }
  };

  const convertToInr = (totals: Record<string, number>) => Object.entries(totals)
    .reduce((total, [currency, amount]) => total + amount * (conversionRates[currency] || 0), 0);

  const fetchExpenses = async () => {
    if (!decodedGroupName) return;
    try {
      const res = await fetch('/api/expenses/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetTitle: decodedGroupName })
      });
      if (res.ok) {
        const data = await res.json();
        const rawExpenses = data.expenses || [];
        setRecordedSettlements(data.settlements || []);
        const sortedExpenses = [...rawExpenses].sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
        setExpenses(sortedExpenses);

        const totals: Record<string, number> = {};
        sortedExpenses.forEach((exp: string[]) => {
          const currency = exp[3] || 'INR';
          const amount = parseFloat(exp[2] || '0');
          totals[currency] = (totals[currency] || 0) + amount;
        });
        setCurrencyTotals(totals);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

  useEffect(() => {
    if (isClient && decodedGroupName) {
      fetchGroupDetails();
      fetchExpenses();
    }
  }, [isClient, decodedGroupName]);

  useEffect(() => {
    if (groupDetails && user) {
      const shares: Record<string, number> = {};
      const paid: Record<string, number> = {};
      const userIdentifier = user.identifier;

      expenses.forEach(expense => {
        const currency = expense[3] || 'INR';
        const amount = parseFloat(expense[2] || '0');
        if (user.name === expense[4] || user.identifier === expense[4]) {
          paid[currency] = (paid[currency] || 0) + amount;
        }
        shares[currency] = (shares[currency] || 0) + calculateExpenseShare(amount, userIdentifier, getExpenseSplit(expense));
      });
      setUserShares(shares);
      setUserPaid(paid);
    }
  }, [groupDetails, expenses, user]);

  useEffect(() => {
    if (groupDetails && availableUsers.length > 0) {
      const currentMembers = groupDetails.members.map((id: string) => {
        const u = availableUsers.find(au => au.identifier === id);
        return u || { identifier: id, name: id };
      });
      setEditMembers(currentMembers);
    }
  }, [groupDetails, availableUsers]);

  const handleAddExpense = async (expense: any) => {
    const res = await fetch('/api/expenses/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetTitle: decodedGroupName,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        payer: expense.payer,
        category: expense.category,
        date: expense.date,
        split: expense.split
      }),
    });
    if (res.ok) {
      setIsModalOpen(false);
      setToast('Expense added successfully! ✅');
      setTimeout(() => setToast(''), 3000);
      fetchExpenses();
    } else {
      setToast('Failed to add expense ❌');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleUpdateExpense = async (expense: any) => {
    if (!editingExpense) return;
    const rowIndex = editingExpense[editingExpense.length - 1];
    const res = await fetch('/api/expenses/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetTitle: decodedGroupName,
        rowIndex,
        values: [expense.date, expense.description, expense.amount, expense.currency, expense.payer, expense.category, JSON.stringify(expense.split)]
      }),
    });
    if (res.ok) {
      setEditingExpense(null);
      setToast('Expense updated successfully! ✅');
      setTimeout(() => setToast(''), 3000);
      fetchExpenses();
    } else {
      setToast('Failed to update expense ❌');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleDeleteExpense = async () => {
    if (!editingExpense) return;
    const rowIndex = editingExpense[editingExpense.length - 1];
    const res = await fetch('/api/expenses/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetTitle: decodedGroupName,
        rowIndex
      }),
    });
    if (res.ok) {
      setEditingExpense(null);
      setToast('Expense deleted successfully! 🗑️');
      setTimeout(() => setToast(''), 3000);
      fetchExpenses();
    } else {
      setToast('Failed to delete expense ❌');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleUpdateGroup = async () => {
    const res = await fetch('/api/groups/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetTitle: decodedGroupName,
        members: editMembers.map(m => m.identifier),
        splitType: editSplitType,
        memberValues: editMemberValues
      }),
    });
    if (res.ok) {
      setToast('Group updated successfully! ⚙️');
      setTimeout(() => setToast(''), 3000);
      setIsSettingsOpen(false);
      fetchGroupDetails();
    } else {
      alert('Failed to update group');
    }
  };

  const categoryIcons: Record<string, string> = {
    Fuel: '⛽',
    Restaurant: '🍴',
    Hotel: '⌂',
    Rent: '⌂',
    Flight: '✈',
    Parking: 'P',
    'Entry fees': '🎟',
    Misc: '⋯',
    Groceries: '🛒',
    Insurance: '✚',
    Visa: 'V',
    'Bus/train': '▣',
    Taxi: '🚕',
  };

  const categoryColors: Record<string, string> = {
    Fuel: '#f4d4df',
    Restaurant: '#d9eadc',
    Hotel: '#d9e4f4',
    Rent: '#f0e1cb',
    Flight: '#e5dcf3',
    Parking: '#f0e1cb',
    'Entry fees': '#f1e5c8',
    Misc: '#e5e7eb',
    Groceries: '#d9eadc',
    Insurance: '#dbe8f2',
    Visa: '#f1e5c8',
    'Bus/train': '#e5dcf3',
    Taxi: '#f4d4df',
  };

  const groupedExpenses = expenses.reduce<Record<string, string[][]>>((groups, expense) => {
    const month = expense[0]
      ? new Date(expense[0]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Other expenses';
    groups[month] = groups[month] || [];
    groups[month].push(expense);
    return groups;
  }, {});

  const settlements = Object.entries(expenses.reduce<Record<string, Record<string, number>>>((byCurrency, expense) => {
    const currency = expense[3] || 'INR';
    const payer = groupDetails?.members?.find((id: string) => id === expense[4])
      || availableUsers.find(member => member.name === expense[4])?.identifier
      || expense[4];
    byCurrency[currency] = byCurrency[currency] || {};
    byCurrency[currency][payer] = (byCurrency[currency][payer] || 0) + parseFloat(expense[2] || '0');
    calculateSplitDetails(parseFloat(expense[2] || '0'), getExpenseSplit(expense)).forEach(detail => {
      byCurrency[currency][detail.userId] = (byCurrency[currency][detail.userId] || 0) - detail.amount;
    });
    return byCurrency;
  }, {})).flatMap(([currency, balances]) => {
    recordedSettlements.filter(settlement => settlement.currency === currency).forEach(settlement => {
      const from = groupDetails?.members?.find((id: string) => id === settlement.from)
        || availableUsers.find(member => member.name === settlement.from)?.identifier
        || settlement.from;
      const to = groupDetails?.members?.find((id: string) => id === settlement.to)
        || availableUsers.find(member => member.name === settlement.to)?.identifier
        || settlement.to;
      balances[from] = (balances[from] || 0) + settlement.amount;
      balances[to] = (balances[to] || 0) - settlement.amount;
    });
    const creditors = Object.entries(balances).filter(([, amount]) => amount > 0.01).map(([userId, amount]) => ({ userId, amount }));
    const debtors = Object.entries(balances).filter(([, amount]) => amount < -0.01).map(([userId, amount]) => ({ userId, amount: -amount }));
    const results: { from: string; to: string; amount: number; currency: string }[] = [];
    let creditorIndex = 0;
    let debtorIndex = 0;
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];
      const amount = Math.min(creditor.amount, debtor.amount);
      const nameFor = (userId: string) => availableUsers.find(member => member.identifier === userId)?.name || userId;
      results.push({ from: nameFor(debtor.userId), to: nameFor(creditor.userId), amount, currency });
      creditor.amount -= amount;
      debtor.amount -= amount;
      if (creditor.amount < 0.01) creditorIndex += 1;
      if (debtor.amount < 0.01) debtorIndex += 1;
    }
    return results;
  });

  const settlementNet: Record<string, number> = {};
  recordedSettlements.forEach(settlement => {
    const from = groupDetails?.members?.find((id: string) => id === settlement.from)
      || availableUsers.find(member => member.name === settlement.from)?.identifier
      || settlement.from;
    const to = groupDetails?.members?.find((id: string) => id === settlement.to)
      || availableUsers.find(member => member.name === settlement.to)?.identifier
      || settlement.to;
    if (from === user?.identifier) settlementNet[settlement.currency] = (settlementNet[settlement.currency] || 0) + settlement.amount;
    if (to === user?.identifier) settlementNet[settlement.currency] = (settlementNet[settlement.currency] || 0) - settlement.amount;
  });

  const namedRecordedSettlements = recordedSettlements.map(settlement => ({
    ...settlement,
    from: availableUsers.find(member => member.identifier === settlement.from)?.name || settlement.from,
    to: availableUsers.find(member => member.identifier === settlement.to)?.name || settlement.to,
  }));

  const simplifiedSettlements = conversionApplied
    ? Object.entries(settlements.reduce<Record<string, { from: string; to: string; amount: number }>>((pairs, settlement) => {
      const [first, second] = [settlement.from, settlement.to].sort();
      const key = `${first}|||${second}`;
      const direction = settlement.from === first ? 1 : -1;
      const convertedAmount = settlement.amount * (conversionRates[settlement.currency] || (settlement.currency === 'INR' ? 1 : 0));
      const pair = pairs[key] || { from: first, to: second, amount: 0 };
      pair.amount += convertedAmount * direction;
      pairs[key] = pair;
      return pairs;
    }, {})).flatMap(([key, pair]) => {
      if (Math.abs(pair.amount) < 0.01) return [];
      return pair.amount > 0
        ? [{ from: pair.from, to: pair.to, amount: pair.amount, currency: 'INR' }]
        : [{ from: pair.to, to: pair.from, amount: Math.abs(pair.amount), currency: 'INR' }];
    })
    : settlements;

  const handleAddSettlement = async () => {
    const amount = Number(settlementAmount);
    if (!settlementFrom || !settlementTo || settlementFrom === settlementTo || !Number.isFinite(amount) || amount <= 0) {
      setToast('Choose two different people and enter a valid amount.');
      return;
    }
    const response = await fetch(editingSettlement ? '/api/settlements/update' : '/api/settlements/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetTitle: decodedGroupName, rowIndex: editingSettlement?.rowIndex, from: settlementFrom, to: settlementTo, amount, currency: settlementCurrency, date: editingSettlement?.date || new Date().toISOString() }),
    });
    if (response.ok) {
      setIsSettlementOpen(false);
      setEditingSettlement(null);
      setSettlementAmount('');
      setToast(editingSettlement ? 'Settlement updated.' : 'Settlement recorded.');
      fetchExpenses();
    } else {
      setToast('Could not record settlement.');
    }
    setTimeout(() => setToast(''), 3000);
  };

  if (!isClient) return <div className="page-loading"><img src="/logo.png" alt="SimplySplit" width={46} height={46} /><p>Loading your ledger...</p></div>;

  return (
    <>
      <div className="container group-page-shell" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <header className="app-topbar">
          <div className="brand-lockup"><img src="/logo.png" alt="SimplySplit" width={34} height={34} /><span>SimplySplit</span></div>
          <div className="dashboard-actions">
            {user && <ProfileMenu user={user} onLogout={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} setToast={setToast} />}
            <button className="icon-button" title="Group settings" aria-label="Group settings" onClick={() => setIsSettingsOpen(true)}>⚙</button>
          </div>
        </header>
        
        <div className="dashboard-topbar">
          <a href="/" className="dashboard-back-link"><span>←</span> Back to groups</a>
        </div>

        <div className="dashboard-heading">
          <span className="dashboard-kicker">Trip ledger</span>
          <h1>{decodedGroupName.split('-')[1] || decodedGroupName}</h1>
          <p>{editMembers.length} {editMembers.length === 1 ? 'traveller' : 'travellers'} · {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</p>
        </div>

        <div className="dashboard-view-tabs" role="tablist" aria-label="Group dashboard views">
          <button type="button" role="tab" aria-selected={activeDashboardView === 'expenses'} className={activeDashboardView === 'expenses' ? 'active' : ''} onClick={() => setActiveDashboardView('expenses')}>
            <span>▤</span> Expenses
          </button>
          <button type="button" role="tab" aria-selected={activeDashboardView === 'balance'} className={activeDashboardView === 'balance' ? 'active' : ''} onClick={() => setActiveDashboardView('balance')}>
            <span>◒</span> Balance overview
          </button>
          <button type="button" role="tab" aria-selected={activeDashboardView === 'charts'} className={activeDashboardView === 'charts' ? 'active' : ''} onClick={() => setActiveDashboardView('charts')}>
            <span>◔</span> Charts
          </button>
        </div>

        {activeDashboardView === 'balance' ? (
          <section className="dashboard-view-panel" role="tabpanel">
            <div className="dashboard-view-heading">
              <div>
                <span className="dashboard-kicker">Money at a glance</span>
                <h2>Balance overview</h2>
                <p>See what has been paid and what your share is.</p>
              </div>
              <span className="dashboard-view-icon">◒</span>
            </div>
            {foreignCurrencies.length > 0 && (
              <button
                className="dashboard-action-button balance-conversion-action"
                onClick={conversionApplied
                  ? () => {
                    setConversionApplied(false);
                    setIsConversionOpen(false);
                  }
                  : () => fetchConversionRates()}
                disabled={conversionLoading}
              >
                {conversionApplied ? 'Back to currencies' : conversionLoading ? 'Updating…' : '₹ Convert'}
              </button>
            )}
            <BalanceCard
              currencyTotals={currencyTotals}
              userShares={userShares}
              userPaid={userPaid}
              settlementNet={settlementNet}
              getCurrencySymbol={getCurrencySymbol}
              showInr={conversionApplied}
              conversionRates={conversionRates}
            />
            <SettlementList 
              settlements={simplifiedSettlements} 
              recordedSettlements={namedRecordedSettlements} 
              getCurrencySymbol={getCurrencySymbol} 
              onEditSettlement={(settlement) => {
                const fromMember = editMembers.find(member => member.name === settlement.from || member.identifier === settlement.from);
                const toMember = editMembers.find(member => member.name === settlement.to || member.identifier === settlement.to);
                setEditingSettlement(settlement);
                setSettlementFrom(fromMember?.identifier || settlement.from);
                setSettlementTo(toMember?.identifier || settlement.to);
                setSettlementAmount(String(settlement.amount));
                setSettlementCurrency(settlement.currency);
                setIsSettlementOpen(true);
              }} 
              onDeleteSettlement={async (settlement) => {
                if (!confirm(`Delete payment from ${settlement.from} to ${settlement.to} of ${settlement.amount} ${settlement.currency}?`)) return;
                const response = await fetch('/api/settlements/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sheetTitle: decodedGroupName, rowIndex: settlement.rowIndex }),
                });
                if (response.ok) {
                  setToast('Settlement deleted. 🗑️');
                  fetchExpenses();
                } else {
                  setToast('Failed to delete settlement ❌');
                }
                setTimeout(() => setToast(''), 3000);
              }}
              onAddSettlement={() => {
                setEditingSettlement(null);
                setSettlementFrom(user?.identifier || editMembers[0]?.identifier || '');
                setSettlementTo(editMembers.find(member => member.identifier !== (user?.identifier || editMembers[0]?.identifier))?.identifier || '');
                setSettlementCurrency(Object.keys(currencyTotals)[0] || 'INR');
                setIsSettlementOpen(true);
              }} 
            />
          </section>
        ) : activeDashboardView === 'charts' ? (
          <section className="dashboard-view-panel" role="tabpanel">
            <div className="dashboard-view-heading">
              <div>
                <span className="dashboard-kicker">Patterns at a glance</span>
                <h2>Expense charts</h2>
                <p>See how your group spending is distributed.</p>
              </div>
              <span className="dashboard-view-icon">◔</span>
            </div>
            {foreignCurrencies.length > 0 && (
              <button
                className="dashboard-action-button balance-conversion-action"
                onClick={conversionApplied
                  ? () => {
                    setConversionApplied(false);
                    setIsConversionOpen(false);
                  }
                  : () => fetchConversionRates()}
                disabled={conversionLoading}
              >
                {conversionApplied ? 'Back to currencies' : conversionLoading ? 'Updating…' : '₹ Convert'}
              </button>
            )}
            {expenses.length > 0 ? (
              <ExpenseChart expenses={expenses} getCurrencySymbol={getCurrencySymbol} showInr={conversionApplied} conversionRates={conversionRates} />
            ) : (
              <p className="expense-empty">Add expenses to see charts.</p>
            )}
          </section>
        ) : (
          <div role="tabpanel">
            <div className="expense-ledger">
              <div className="expense-ledger-header">
                <h2>Expenses</h2>
                <span>{expenses.length} {expenses.length === 1 ? 'item' : 'items'}</span>
              </div>
              {expenses.length > 0 ? (
                <div className="expense-groups">
                  {Object.entries(groupedExpenses).map(([month, monthExpenses]) => (
                    <section key={month} className="expense-month-group">
                      <h3 className="expense-month-heading">{month}</h3>
                      {monthExpenses.map((exp, index) => {
                        const expenseDate = exp[0] ? new Date(exp[0]) : null;
                        const isPayer = user?.name === exp[4] || user?.identifier === exp[4];
                        const fullAmount = parseFloat(exp[2] || '0');
                        const expenseSplit = getExpenseSplit(exp);
                        const isInvolved = Boolean(user && (isPayer || expenseSplit.includedMembers.includes(user.identifier)));
                        const userShare = user?.identifier
                          ? calculateExpenseShare(fullAmount, user.identifier, expenseSplit)
                          : 0;
                        const displayAmount = isPayer ? fullAmount - userShare : userShare;
                        const category = exp[5] || 'Misc';

                        return (
                          <button
                            key={`${exp[1]}-${exp[0]}-${index}`}
                            className="expense-row"
                            onClick={() => setEditingExpense(exp)}
                            type="button"
                          >
                            <span className="expense-date">
                              <span>{expenseDate ? expenseDate.toLocaleDateString('en-US', { month: 'short' }) : '—'}</span>
                              <strong>{expenseDate ? expenseDate.getDate() : '—'}</strong>
                            </span>
                            <span className="expense-category-icon" style={{ backgroundColor: categoryColors[category] || categoryColors.Misc }}>
                              {categoryIcons[category] || categoryIcons.Misc}
                            </span>
                            <span className="expense-copy">
                              <strong>{exp[1] || 'Untitled expense'}</strong>
                              <span>{isPayer ? `You paid ${formatCurrency(getCurrencySymbol(exp[3]), fullAmount)}` : `${exp[4] || 'Someone'} paid ${formatCurrency(getCurrencySymbol(exp[3]), fullAmount)}`}</span>
                            </span>
                            <span className={`expense-result ${!isInvolved ? 'expense-result-neutral' : isPayer ? 'expense-result-lent' : 'expense-result-borrowed'}`}>
                              <span>{!isInvolved ? 'not involved' : isPayer ? 'you lent' : 'you borrowed'}</span>
                              {isInvolved && <strong>{formatCurrency(getCurrencySymbol(exp[3]), displayAmount)}</strong>}
                            </span>
                            <span className="expense-chevron" aria-hidden="true">›</span>
                          </button>
                        );
                      })}
                    </section>
                  ))}
                </div>
              ) : (
                <p className="expense-empty">No expenses recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {isModalOpen && (
          <div className="workspace-modal" role="dialog" aria-modal="true" aria-label="Add expense" onMouseDown={() => setIsModalOpen(false)}>
            <div className="workspace-modal-panel" onMouseDown={(event) => event.stopPropagation()}>
              <ExpenseForm
                onAdd={handleAddExpense}
                members={editMembers}
                defaultSplitType={groupDetails?.splitType || 'equal'}
                defaultMemberValues={groupDetails?.memberValues || {}}
                onClose={() => setIsModalOpen(false)}
              />
              <button className="modal-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Edit Expense Modal */}
        {editingExpense && (
          <div className="workspace-modal" role="dialog" aria-modal="true" aria-label="Edit expense" onMouseDown={() => setEditingExpense(null)}>
            <div className="workspace-modal-panel" onMouseDown={(event) => event.stopPropagation()}>
              <ExpenseForm
                onAdd={handleUpdateExpense}
                members={editMembers}
                defaultSplitType={groupDetails?.splitType || 'equal'}
                defaultMemberValues={groupDetails?.memberValues || {}}
                initialExpense={editingExpense}
                onClose={() => setEditingExpense(null)}
              />
              <button className="modal-secondary" onClick={() => setEditingExpense(null)}>Cancel</button>
              <button className="modal-delete" onClick={handleDeleteExpense}>Delete expense</button>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="workspace-modal" role="dialog" aria-modal="true" aria-label="Group settings" onMouseDown={() => setIsSettingsOpen(false)}>
            <div className="card workspace-modal-panel settings-panel" onMouseDown={(event) => event.stopPropagation()}>
              <h3>Group Settings</h3>

              <h4>Members</h4>
              <div style={{ marginBottom: '15px' }}>
                {editMembers.map(m => (
                  <div key={m.identifier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{m.name} {m.identifier === user?.identifier ? '(You)' : ''}</span>
                    {(editSplitType === 'percentage' || editSplitType === 'share') && (
                      <input
                        type="number"
                        placeholder={editSplitType === 'percentage' ? '%' : 'Share'}
                        value={editMemberValues[m.identifier] || ''}
                        onChange={(e) => setEditMemberValues({ ...editMemberValues, [m.identifier]: e.target.value })}
                        style={{ width: '70px', padding: '5px' }}
                      />
                    )}
                    {m.identifier !== user?.identifier && (
                      <button className="button danger" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setEditMembers(editMembers.filter(em => em.identifier !== m.identifier))}>X</button>
                    )}
                  </div>
                ))}
              </div>

              <select onChange={(e) => {
                const member = availableUsers.find(u => u.identifier === e.target.value);
                if (member && !editMembers.some(m => m.identifier === member.identifier)) {
                  setEditMembers([...editMembers, member]);
                }
                e.target.value = '';
              }} style={{ marginBottom: '15px' }}>
                <option value="">+ Add Member</option>
                {availableUsers.filter(u => !editMembers.some(m => m.identifier === u.identifier)).map(u => (
                  <option key={u.identifier} value={u.identifier}>{u.name}</option>
                ))}
              </select>

              <h4>Split Logic</h4>
              <select value={editSplitType} onChange={(e) => setEditSplitType(e.target.value)} style={{ marginBottom: '20px' }}>
                <option value="equal">Equal Split</option>
                <option value="percentage">Percentage Split</option>
                <option value="share">Share Split</option>
              </select>

              <div className="settings-actions">
                <button className="button" onClick={handleUpdateGroup}>Save Changes</button>
                <button className="modal-secondary" onClick={() => setIsSettingsOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isConversionOpen && (
        <div className="expense-chart-modal" role="dialog" aria-modal="true" aria-labelledby="conversion-title" onMouseDown={() => setIsConversionOpen(false)}>
          <div className="conversion-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="expense-chart-dialog-header">
              <h2 id="conversion-title">Converted to rupees</h2>
              <button type="button" onClick={() => setIsConversionOpen(false)} aria-label="Close currency conversion">×</button>
            </div>
            {conversionError ? (
              <p className="conversion-error">{conversionError}</p>
            ) : (
              <>
                <div className="conversion-summary">
                  <div><span>Total paid</span><strong>{formatCurrency('₹', convertToInr(currencyTotals))}</strong></div>
                  <div><span>Total owed</span><strong>{formatCurrency('₹', convertToInr(userShares))}</strong></div>
                </div>
                <div className="conversion-rates">
                  <h3>Rates used</h3>
                  <div className="conversion-rate-row"><span>1 INR</span><strong>₹1.00</strong></div>
                  {foreignCurrencies.map(currency => (
                    <div key={currency} className="conversion-rate-row">
                      <span>1 {currency}</span>
                      <strong>₹{formatRate(conversionRates[currency] || 0)}</strong>
                    </div>
                  ))}
                </div>
                <p className="conversion-source">Source: Frankfurter.app{conversionUpdatedAt ? ` · Updated ${new Date(conversionUpdatedAt).toLocaleString()}` : ''}</p>
              </>
            )}
            <button type="button" className="conversion-refresh" onClick={() => fetchConversionRates()} disabled={conversionLoading}>
              {conversionLoading ? 'Refreshing…' : 'Refresh rates'}
            </button>
          </div>
        </div>
      )}

      {isSettlementOpen && (
        <div className="workspace-modal" role="dialog" aria-modal="true" aria-label="Record settlement" onMouseDown={() => setIsSettlementOpen(false)}>
          <div className="card workspace-modal-panel settlement-form-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="expense-chart-dialog-header">
              <div><span className="dashboard-kicker">Close the loop</span><h2>{editingSettlement ? 'Edit settlement' : 'Record settlement'}</h2></div>
              <button type="button" onClick={() => setIsSettlementOpen(false)} aria-label="Close settlement form">×</button>
            </div>
            <p className="settlement-form-help">Record who paid whom so the remaining balance stays accurate.</p>
            <label>Paid by<select value={settlementFrom} onChange={(event) => setSettlementFrom(event.target.value)}>{editMembers.map(member => <option key={member.identifier} value={member.identifier}>{member.name}</option>)}</select></label>
            <label>Paid to<select value={settlementTo} onChange={(event) => setSettlementTo(event.target.value)}>{editMembers.filter(member => member.identifier !== settlementFrom).map(member => <option key={member.identifier} value={member.identifier}>{member.name}</option>)}</select></label>
            <div className="settlement-form-amount"><label>Amount<input type="number" min="0.01" step="0.01" value={settlementAmount} onChange={(event) => setSettlementAmount(event.target.value)} placeholder="0.00" /></label><label>Currency<select value={settlementCurrency} onChange={(event) => setSettlementCurrency(event.target.value)}><option value="INR">INR ₹</option><option value="USD">USD $</option><option value="EUR">EUR €</option></select></label></div>
            <div className="settings-actions"><button className="button" onClick={handleAddSettlement}>{editingSettlement ? 'Update settlement' : 'Save settlement'}</button><button className="modal-secondary" onClick={() => { setIsSettlementOpen(false); setEditingSettlement(null); }}>Cancel</button></div>
          </div>
        </div>
      )}

      {activeDashboardView === 'expenses' && (
        <button className="fab" onClick={() => setIsModalOpen(true)} style={{ zIndex: 10001 }}>+</button>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
