export function extractCode(currencyStr: string): string {
    if (!currencyStr) return '';
    if (currencyStr.includes('_')) {
        const parts = currencyStr.split('_');
        return parts[0]; // e.g., "INR_India" -> "INR"
    }
    return currencyStr;
}

export function getCurrencySymbol(codeOrCombo: string): string {
    const code = extractCode(codeOrCombo);
    if (!code) return '₹';
    // If it's already a symbol (e.g., legacy users with '₹' saved), just return it
    if (code.length === 1 && !/^[A-Za-z]+$/.test(code)) return code;

    try {
        const parts = new Intl.NumberFormat('en', {
            style: 'currency',
            currency: code,
            maximumFractionDigits: 0
        }).formatToParts(0);
        return parts.find(p => p.type === 'currency')?.value || code;
    } catch (e) {
        return code; // Fallback
    }
}

export function getCurrencyName(codeOrCombo: string): string {
    const code = extractCode(codeOrCombo);
    if (!code) return 'Indian Rupee';
    // Provide a fallback for legacy 1-character symbols
    if (code.length === 1 && !/^[A-Za-z]+$/.test(code)) return 'Local Currency';

    try {
        const names = new Intl.DisplayNames(['en'], { type: 'currency' });
        return names.of(code) || code;
    } catch (e) {
        return code;
    }
}

export async function convertCurrency(amount: number, fromCodeRaw: string, toCodeRaw: string): Promise<number> {
    const fromCode = extractCode(fromCodeRaw);
    const toCode = extractCode(toCodeRaw);
    if (fromCode === toCode) return amount;

    try {
        // 1. Try to use cached USD rates if available
        const cached = localStorage.getItem('exchange_rates_USD');
        const cachedTimeStr = localStorage.getItem('exchange_rates_time_USD');
        const now = Date.now();

        const isSameDate = cachedTimeStr && new Date(now).toISOString().split('T')[0] === new Date(parseInt(cachedTimeStr)).toISOString().split('T')[0];

        if (cached && isSameDate) {
            const rates = JSON.parse(cached);
            const rateFrom = rates[fromCode];
            const rateTo = rates[toCode];

            if (rateFrom && rateTo) {
                // Convert amount to USD first, then to target currency
                const amountInUSD = amount / rateFrom;
                return amountInUSD * rateTo;
            }
        }

        // 2. Fallback to direct fetch
        const res = await fetch(`https://open.er-api.com/v6/latest/${fromCode}`);
        if (!res.ok) throw new Error('Failed to fetch rates');
        const data = await res.json();

        const rate = data.rates[toCode];
        if (!rate) throw new Error(`Rate not found for ${toCode}`);

        return amount * rate;
    } catch (e) {
        console.error("Currency conversion error:", e);
        return amount; // Fallback to original amount if API fails
    }
}
