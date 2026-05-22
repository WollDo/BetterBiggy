async function fetchRates() {
  try {
    const [btcRes, fxRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
      fetch('https://api.frankfurter.app/latest?from=USD')
    ]);
    const btcData = await btcRes.json();
    const fxData  = await fxRes.json();
    const btcUsd   = btcData.bitcoin.usd;
    const allRates = { ...fxData.rates, USD: 1 };
    const { targetCurrency } = await chrome.storage.local.get('targetCurrency');
    const usdRate = targetCurrency ? (allRates[targetCurrency] ?? 1) : 1;
    await chrome.storage.local.set({ btcUsd, usdRate, allRates, lastUpdated: Date.now() });
  } catch (e) {
    console.error('BetterBiggy: rate fetch failed', e);
  }
}

async function fetchCurrencyList() {
  try {
    const res  = await fetch('https://api.frankfurter.app/currencies');
    const data = await res.json();
    data['USD'] = 'US Dollar';
    await chrome.storage.local.set({ currencies: data });
  } catch (e) {
    console.error('BetterBiggy: currency list fetch failed', e);
  }
}

async function ensureAlarms() {
  const existing = await chrome.alarms.getAll();
  const names = existing.map(a => a.name);
  if (!names.includes('refreshRates'))      chrome.alarms.create('refreshRates',      { periodInMinutes: 60   });
  if (!names.includes('refreshCurrencies')) chrome.alarms.create('refreshCurrencies', { periodInMinutes: 1440 });
}

chrome.runtime.onInstalled.addListener(async () => {
  await fetchCurrencyList();
  await fetchRates();
  await ensureAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  await fetchRates();
  await ensureAlarms();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'refreshRates')      fetchRates();
  if (alarm.name === 'refreshCurrencies') fetchCurrencyList();
});

// When currency changes, derive usdRate from cached allRates — no extra API call
chrome.storage.onChanged.addListener(changes => {
  if (!changes.targetCurrency) return;
  const code = changes.targetCurrency.newValue;
  chrome.storage.local.get('allRates', ({ allRates }) => {
    if (allRates && code) chrome.storage.local.set({ usdRate: allRates[code] ?? 1 });
    else fetchRates();
  });
});