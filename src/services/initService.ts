import type { CurrencyData } from '../components/Settings/HouseholdSettings/CurrencyManager';

export const fetchAndCacheCurrencies = async (): Promise<CurrencyData[] | null> => {
    const cached = localStorage.getItem('currency_full_data_v4');
    const cachedTime = localStorage.getItem('currency_full_data_time_v4');
    const now = Date.now();

    if (cached && cachedTime && now - parseInt(cachedTime) < 24 * 60 * 60 * 1000) {
        // Cache is still valid
        try {
            return JSON.parse(cached);
        } catch (e) {
            // Ignore parse error and refetch
        }
    }

    try {
        const res = await fetch('https://restcountries.com/v4/all?fields=name,currencies,flag');
        if (res.ok) {
            const countriesData = await res.json();
            const currenciesList: CurrencyData[] = [];

            countriesData.forEach((c: any) => {
                const countryName = c.name?.common;
                const flag = c.flag?.svg || '';

                if (!c.currencies || !Array.isArray(c.currencies)) {
                    // Fallback just in case the API returns an object format for some countries in v3.1
                    if (c.currencies && typeof c.currencies === 'object') {
                        Object.keys(c.currencies).forEach(code => {
                            const curr = c.currencies[code];
                            if (curr && curr.symbol) {
                                currenciesList.push({
                                    code: code,
                                    name: curr.name || code,
                                    symbol: curr.symbol,
                                    countryName,
                                    flag
                                });
                            }
                        });
                    }
                    return;
                }

                c.currencies.forEach((curr: any) => {
                    if (curr.code && curr.symbol) {
                        currenciesList.push({
                            code: curr.code,
                            name: curr.name || curr.code,
                            symbol: curr.symbol,
                            countryName,
                            flag
                        });
                    }
                });
            });

            // Sort by country name alphabetically
            currenciesList.sort((a, b) => a.countryName.localeCompare(b.countryName));

            localStorage.setItem('currency_full_data_v4', JSON.stringify(currenciesList));
            localStorage.setItem('currency_full_data_time_v4', now.toString());
            return currenciesList;
        }
    } catch (e) {
        console.error("Failed to fetch currencies in background", e);
    }
    return null;
};

export const fetchAndCacheExchangeRates = async (baseCurrency: string = 'USD') => {
    const cacheKey = `exchange_rates_${baseCurrency}`;
    const timeKey = `exchange_rates_time_${baseCurrency}`;
    const cached = localStorage.getItem(cacheKey);
    const cachedTimeStr = localStorage.getItem(timeKey);
    const now = Date.now();

    const isSameDate = cachedTimeStr && new Date(now).toISOString().split('T')[0] === new Date(parseInt(cachedTimeStr)).toISOString().split('T')[0];

    // If we have cached rates and it was fetched today, skip refetch
    if (cached && isSameDate) {
        return;
    }

    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(cacheKey, JSON.stringify(data.rates));
            localStorage.setItem(timeKey, now.toString());
        }
    } catch (e) {
        console.error("Failed to fetch exchange rates in background", e);
    }
};

export const runInitJobs = async () => {
    // Fire and forget all initialization jobs
    Promise.allSettled([
        fetchAndCacheCurrencies(),
        fetchAndCacheExchangeRates()
    ]);
};
