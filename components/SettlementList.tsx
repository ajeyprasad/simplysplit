import React from 'react';

interface SettlementListProps {
  settlements: { from: string; to: string; amount: number; currency: string }[];
  getCurrencySymbol: (code: string) => string;
  onAddSettlement: () => void;
  recordedSettlements: { date: string; from: string; to: string; amount: number; currency: string; rowIndex: number }[];
  onEditSettlement: (settlement: { date: string; from: string; to: string; amount: number; currency: string; rowIndex: number }) => void;
  onDeleteSettlement: (settlement: { date: string; from: string; to: string; amount: number; currency: string; rowIndex: number }) => void;
}

export default function SettlementList({ settlements, getCurrencySymbol, onAddSettlement, recordedSettlements, onEditSettlement, onDeleteSettlement }: SettlementListProps) {
  return (
    <div className="card settlement-list">
      <div className="settlement-header"><h3>Settlements</h3><button type="button" onClick={onAddSettlement}>+ Record payment</button></div>
      {recordedSettlements.length > 0 && (
        <div className="settlement-history">
          <span className="settlement-section-label">Recorded payments</span>
          {recordedSettlements.map((payment, index) => (
            <div
              key={`${payment.date}-${payment.from}-${index}`}
              className="settlement-history-row"
            >
              <div
                style={{ display: 'contents', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onClick={() => onEditSettlement(payment)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onEditSettlement(payment);
                }}
              >
                <span className="settlement-history-date">{payment.date ? new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable'}</span>
                <span className="settlement-history-copy"><strong>{payment.from}</strong><span>paid {payment.to}</span></span>
                <strong className="settlement-history-amount">{getCurrencySymbol(payment.currency)}{payment.amount.toFixed(2)}</strong>
              </div>
              <button 
                className="settlement-edit-button" 
                style={{ color: 'var(--color-danger)', borderColor: 'var(--border-color)', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={(e) => { e.stopPropagation(); onDeleteSettlement(payment); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {settlements.length > 0 ? (
        <div className="settlement-suggestions">
          <span className="settlement-section-label">Still to settle</span>
          {settlements.map((s, i) => (
            <div key={i} className="settlement-item">
              {s.from} pays {s.to}: <strong>{getCurrencySymbol(s.currency)}{s.amount.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      ) : recordedSettlements.length === 0 ? (
        <div className="settlement-empty">
          <span>✓</span>
          <div><strong>All clear for now</strong><p>Settlement suggestions will appear here.</p></div>
        </div>
      ) : null}
    </div>
  );
}
