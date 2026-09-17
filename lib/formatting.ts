const amountFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const rateFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
});

export const formatAmount = (amount: number) => amountFormatter.format(amount);

export const formatCurrency = (symbol: string, amount: number) => `${symbol}${formatAmount(amount)}`;

export const formatRate = (rate: number) => rateFormatter.format(rate);