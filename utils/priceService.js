const axios = require('axios');

/**
 * Price Service - Fetches real-time prices from external APIs
 * Supports: Crypto (CoinGecko), Stocks (Alpha Vantage/Yahoo Finance), Mutual Funds (AMFI),
 * and basic FX rates (INR ↔ USD) for multi-currency display.
 */

// Cache for prices and FX rates (5 minutes TTL)
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get cached price or null if expired
 */
function getCachedPrice(symbol, assetType) {
    const cacheKey = `${assetType}_${symbol}`;
    const cached = priceCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.price;
    }

    return null;
}

/**
 * Set price in cache
 */
function setCachedPrice(symbol, assetType, price) {
    const cacheKey = `${assetType}_${symbol}`;
    priceCache.set(cacheKey, {
        price,
        timestamp: Date.now()
    });
}

/**
 * Fetch cryptocurrency price from CoinGecko
 * NOTE: We fetch price in USD as the canonical quote currency.
 */
async function fetchCryptoPrice(symbol) {
    try {
        // Check cache first
        const cached = getCachedPrice(symbol, 'CRYPTO');
        if (cached !== null) {
            return cached;
        }

        // CoinGecko API (free tier)
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price`,
            {
                params: {
                    ids: symbol.toLowerCase(), // e.g., 'bitcoin', 'ethereum'
                    vs_currencies: 'usd',
                    include_24hr_change: true
                },
                timeout: 5000
            }
        );

        const data = response.data;
        const priceData = data[symbol.toLowerCase()];
        
        if (priceData && priceData.usd) {
            const price = priceData.usd;
            setCachedPrice(symbol, 'CRYPTO', price);
            return price;
        }

        throw new Error(`Price not found for ${symbol}`);
    } catch (error) {
        console.error(`Error fetching crypto price for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Fetch stock price from Alpha Vantage (free tier)
 * Note: Alpha Vantage has rate limits (5 calls/minute, 500 calls/day)
 */
async function fetchStockPrice(symbol, exchange = 'NSE') {
    try {
        // Check cache first
        const cached = getCachedPrice(symbol, 'STOCK');
        if (cached !== null) {
            return cached;
        }

        // For Indian stocks, use Alpha Vantage with BSE/NSE
        // Format: SYMBOL.BSE or SYMBOL.NSE
        const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
        const stockSymbol = exchange === 'BSE' ? `${symbol}.BSE` : `${symbol}.NSE`;

        const response = await axios.get(
            'https://www.alphavantage.co/query',
            {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: stockSymbol,
                    apikey: apiKey
                },
                timeout: 5000
            }
        );

        const data = response.data;
        
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
            const price = parseFloat(data['Global Quote']['05. price']);
            setCachedPrice(symbol, 'STOCK', price);
            return price;
        }

        // Fallback: Try Yahoo Finance (unofficial API)
        return await fetchStockPriceYahoo(symbol);
    } catch (error) {
        console.error(`Error fetching stock price for ${symbol}:`, error.message);
        // Try Yahoo Finance as fallback
        try {
            return await fetchStockPriceYahoo(symbol);
        } catch (fallbackError) {
            throw new Error(`Failed to fetch stock price: ${error.message}`);
        }
    }
}

/**
 * Fetch stock price from Yahoo Finance (fallback)
 */
async function fetchStockPriceYahoo(symbol) {
    try {
        // Yahoo Finance API (unofficial, may have rate limits)
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`, // .NS for NSE
            {
                timeout: 5000
            }
        );

        const data = response.data;
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            
            if (meta.regularMarketPrice) {
                const price = meta.regularMarketPrice;
                setCachedPrice(symbol, 'STOCK', price);
                return price;
            }
        }

        throw new Error(`Price not found for ${symbol}`);
    } catch (error) {
        console.error(`Error fetching stock price from Yahoo for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Fetch Mutual Fund NAV from AMFI
 * Note: AMFI data is updated once per day after market close
 */
async function fetchMutualFundNAV(schemeCode) {
    try {
        // Check cache first
        const cached = getCachedPrice(schemeCode, 'MUTUAL_FUND');
        if (cached !== null) {
            return cached;
        }

        // AMFI NAV API (free, updated daily)
        const response = await axios.get(
            'https://www.amfiindia.com/spages/NAVAll.txt',
            {
                timeout: 10000
            }
        );

        // Parse AMFI text format
        const lines = response.data.split('\n');
        let nav = null;

        for (const line of lines) {
            if (line.includes(schemeCode)) {
                const parts = line.split(';');
                if (parts.length >= 5) {
                    nav = parseFloat(parts[4]);
                    break;
                }
            }
        }

        if (nav && !isNaN(nav)) {
            setCachedPrice(schemeCode, 'MUTUAL_FUND', nav);
            return nav;
        }

        throw new Error(`NAV not found for scheme code ${schemeCode}`);
    } catch (error) {
        console.error(`Error fetching mutual fund NAV for ${schemeCode}:`, error.message);
        throw error;
    }
}

/**
 * Fetch INR → USD FX rate for display conversions.
 * We keep INR as canonical storage currency on the backend and
 * use this FX rate only to expose USD-equivalent values in APIs.
 */
async function fetchInrToUsdRate() {
    const cacheKey = 'FX_INR_USD';
    const cached = priceCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.price;
    }

    try {
        // exchangerate.host is free and does not require an API key
        const response = await axios.get('https://api.exchangerate.host/latest', {
            params: {
                base: 'INR',
                symbols: 'USD'
            },
            timeout: 5000
        });

        const rate = response.data && response.data.rates && response.data.rates.USD;

        if (!rate || Number.isNaN(rate)) {
            throw new Error('Invalid INR→USD FX rate received');
        }

        priceCache.set(cacheKey, {
            price: rate,
            timestamp: Date.now()
        });

        return rate;
    } catch (error) {
        console.error('Error fetching INR→USD FX rate:', error.message);
        throw error;
    }
}

/**
 * Batch update prices for multiple assets
 */
async function batchUpdatePrices(assets) {
    const results = [];
    const errors = [];

    for (const asset of assets) {
        try {
            let price;
            
            switch (asset.assetType) {
                case 'CRYPTO':
                    price = await fetchCryptoPrice(asset.symbol);
                    break;
                case 'STOCK':
                    price = await fetchStockPrice(asset.symbol, asset.exchange);
                    break;
                case 'MUTUAL_FUND':
                    price = await fetchMutualFundNAV(asset.symbol);
                    break;
                default:
                    throw new Error(`Unknown asset type: ${asset.assetType}`);
            }

            results.push({
                assetId: asset._id || asset.id,
                symbol: asset.symbol,
                assetType: asset.assetType,
                price,
                success: true
            });
        } catch (error) {
            errors.push({
                assetId: asset._id || asset.id,
                symbol: asset.symbol,
                assetType: asset.assetType,
                error: error.message,
                success: false
            });
        }
    }

    return { results, errors };
}

/**
 * Clear price cache (useful for testing or forced refresh)
 */
function clearPriceCache() {
    priceCache.clear();
}

module.exports = {
    fetchCryptoPrice,
    fetchStockPrice,
    fetchMutualFundNAV,
    fetchInrToUsdRate,
    batchUpdatePrices,
    clearPriceCache,
    getCachedPrice,
    setCachedPrice
};

