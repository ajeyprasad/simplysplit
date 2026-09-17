import { NextResponse } from 'next/server';

const supportedCurrencies = new Set(['USD', 'EUR']);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const requestedCurrencies = (url.searchParams.get('currencies') || 'USD,EUR')
        .split(',')
        .map(currency => currency.trim().toUpperCase())
        .filter(currency => supportedCurrencies.has(currency));

    try {
        const rateEntries = await Promise.all(requestedCurrencies.map(async currency => {
            const response = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=INR`, {
                next: { revalidate: 300 },
            });
            if (!response.ok) throw new Error(`Could not fetch ${currency} conversion rate`);
            const data = await response.json();
            return [currency, Number(data.rates?.INR)] as const;
        }));

        return NextResponse.json({
            base: 'INR',
            rates: { INR: 1, ...Object.fromEntries(rateEntries) },
            provider: 'Frankfurter.app',
            fetchedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Failed to fetch currency rates:', error);
        return NextResponse.json({ error: 'Unable to fetch current currency rates' }, { status: 502 });
    }
}