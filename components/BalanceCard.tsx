import React from 'react';
import { formatCurrency } from '@/lib/formatting';

interface BalanceCardProps {
  currencyTotals: Record<string, number>;
  userShares: Record<string, number>;
  userPaid: Record<string, number>;
  settlementNet?: Record<string, number>;
  getCurrencySymbol: (code: string) => string;
  showInr?: boolean;
  conversionRates?: Record<string, number>;
}

export default function BalanceCard({ currencyTotals, userShares, userPaid, settlementNet = {}, getCurrencySymbol, showInr = false, conversionRates = {} }: BalanceCardProps) {
  const convertTotals = (totals: Record<string, number>) => Object.entries(totals).reduce(
    (sum, [currency, total]) => sum + total * (conversionRates[currency] || 0),
    0
  );

  const formatTotal = (totals: Record<string, number>) => {
    if (showInr) {
      return formatCurrency('₹', convertTotals(totals));
    }

    const parts = Object.entries(totals).map(([currency, total]) =>
      formatCurrency(getCurrencySymbol(currency), total)
    );
    return parts.length > 0 ? parts.join(' + ') : '0.00';
  };

  const netByCurrency: Record<string, number> = {};
  new Set([...Object.keys(userPaid), ...Object.keys(userShares)]).forEach(currency => {
    netByCurrency[currency] = (userPaid[currency] || 0) - (userShares[currency] || 0) + (settlementNet[currency] || 0);
  });

  const netEntries = Object.entries(netByCurrency).filter(([_, amount]) => Math.abs(amount) > 0.001);

  const netTotal = showInr
    ? convertTotals(netByCurrency)
    : Object.values(netByCurrency).reduce((sum, amount) => sum + amount, 0);

  const formatNetAmount = (entries: [string, number][]) => {
    if (showInr) {
      return formatCurrency('₹', Math.abs(netTotal));
    }
    return entries.map(([currency, amount]) => formatCurrency(getCurrencySymbol(currency), Math.abs(amount))).join(' / ') || '0.00';
  };

  const getNetLabel = (entries: [string, number][]) => {
    const hasLent = entries.some(([_, amount]) => amount > 0);
    const hasBorrowed = entries.some(([_, amount]) => amount < 0);
    
    if (hasLent && hasBorrowed) return 'Mixed balance';
    return netTotal >= 0 ? 'You lent' : 'You borrowed';
  };

  const netLabel = getNetLabel(netEntries);
  const netAmount = formatNetAmount(netEntries);

  return (
    <div className="card balance-card">
      <div className="balance-header">
        <div>
          <span className="balance-eyebrow">Balance summary</span>
          <h3>Balance Overview{showInr ? ' (INR)' : ''}</h3>
        </div>
        <span className="balance-status">{showInr ? 'Converted to INR' : 'Original currencies'}</span>
      </div>
      <div className="balance-info balance-info-three">
        <div className="balance-metric balance-metric-expense">
          <span><i>Σ</i> Total expenses</span>
          <strong>{formatTotal(currencyTotals)}</strong>
        </div>
        <div className="balance-metric balance-metric-share">
          <span><i>◒</i> Your total share</span>
          <strong>{formatTotal(userShares)}</strong>
        </div>
        <div className={`balance-metric ${netTotal >= 0 ? 'balance-metric-lent' : 'balance-metric-borrowed'}`}>
          <span><i>{netTotal >= 0 ? '↑' : '↓'}</i> {netLabel}</span>
          <strong>{netAmount}</strong>
        </div>
      </div>
    </div>
  );
}
