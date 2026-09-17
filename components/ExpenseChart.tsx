'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/formatting';

interface ExpenseChartProps {
    expenses: string[][];
    getCurrencySymbol: (code: string) => string;
    showInr?: boolean;
    conversionRates?: Record<string, number>;
}

type ChartMode = 'pie' | 'bar';

const categoryColors: Record<string, string> = {
    Misc: '#9ca3af',
    Fuel: '#f59e0b',
    Restaurant: '#45c8b3',
    Hotel: '#6b8fd6',
    Rent: '#c08457',
    Flight: '#a78bda',
    Parking: '#d97791',
    'Bus/train': '#4f9cae',
    Insurance: '#6aa6c8',
    Visa: '#e0ad54',
    Groceries: '#70b77e',
    Taxi: '#ed8b62',
    'Entry fees': '#c68bd8',
};

export default function ExpenseChart({ expenses, getCurrencySymbol, showInr = false, conversionRates = {} }: ExpenseChartProps) {
    const [mode, setMode] = useState<ChartMode>('pie');
    const [selectedCurrency, setSelectedCurrency] = useState('');

    const currencies = showInr
        ? ['INR']
        : Array.from(new Set(expenses.map(expense => expense[3] || 'INR')));
    const currency = showInr ? 'INR' : selectedCurrency || currencies[0] || 'INR';
    const categoryTotals = expenses
        .filter(expense => showInr || (expense[3] || 'INR') === currency)
        .reduce<Record<string, number>>((totals, expense) => {
            const category = expense[5] || 'Misc';
            const amount = parseFloat(expense[2] || '0');
            const convertedAmount = showInr
                ? amount * (conversionRates[expense[3] || 'INR'] || 0)
                : amount;
            totals[category] = (totals[category] || 0) + convertedAmount;
            return totals;
        }, {});
    const entries = Object.entries(categoryTotals).sort(([, first], [, second]) => second - first);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    let accumulatedPercentage = 0;
    const pieStops = entries.map(([category, amount]) => {
        const start = accumulatedPercentage;
        accumulatedPercentage += (amount / total) * 100;
        return `${categoryColors[category] || categoryColors.Misc} ${start}% ${accumulatedPercentage}%`;
    });

    if (entries.length === 0) return null;

    return (
        <section className="expense-chart card">
            <div className="expense-chart-header">
                <div>
                    <h2>Expense breakdown</h2>
                    <p>{showInr ? 'Spending by category in rupees' : 'Spending by category'}</p>
                </div>
                <div className="expense-chart-actions">
                    {currencies.length > 1 && (
                        <select value={currency} onChange={(event) => setSelectedCurrency(event.target.value)} aria-label="Chart currency">
                            {currencies.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                    )}
                    <div className="expense-chart-toggle" role="group" aria-label="Chart type">
                        <button type="button" className={mode === 'pie' ? 'active' : ''} onClick={() => setMode('pie')}>Pie</button>
                        <button type="button" className={mode === 'bar' ? 'active' : ''} onClick={() => setMode('bar')}>Bars</button>
                    </div>
                </div>
            </div>

            {mode === 'pie' ? (
                <div className="expense-pie-layout">
                    <div className="expense-pie" style={{ background: `conic-gradient(${pieStops.join(', ')})` }} aria-label="Pie chart of expenses by category" />
                    <div className="expense-chart-legend">
                        {entries.map(([category, amount]) => (
                            <div key={category} className="expense-legend-row">
                                <span className="expense-legend-label"><i style={{ backgroundColor: categoryColors[category] || categoryColors.Misc }} />{category}</span>
                                <strong>{formatCurrency(getCurrencySymbol(currency), amount)}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="expense-bars" aria-label="Bar chart of expenses by category">
                    {entries.map(([category, amount]) => (
                        <div key={category} className="expense-bar-row">
                            <div className="expense-bar-label"><span>{category}</span><strong>{formatCurrency(getCurrencySymbol(currency), amount)}</strong></div>
                            <div className="expense-bar-track"><span style={{ width: `${(amount / entries[0][1]) * 100}%`, backgroundColor: categoryColors[category] || categoryColors.Misc }} /></div>
                        </div>
                    ))}
                </div>
            )}
            <div className="expense-chart-total">Total {formatCurrency(getCurrencySymbol(currency), total)}</div>
        </section>
    );
}