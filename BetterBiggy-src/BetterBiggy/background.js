async function fetchRates() {
  try {
    const [btcRes, fxRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"),
      fetch("https://api.frankfurter.app/latest?from=USD")
    ]);

    const btcData = await btcRes.json();
    const fxData  = await fxRes.json();

    const btcUsd   = btcData.bitcoin.usd;
    const allRates = { ...fxData.rates, USD: 1 };

    const { targetCurrency } = await chrome.storage.local.get("targetCurrency");
    const usdRate = targetCurrency ? (allRates[targetCurrency] ?? 1) : 1;

    await chrome.storage.local.set({ btcUsd, usdRate, allRates, lastUpdated: Date.now() });
    console.log("Rates updated: BTC=$" + btcUsd);
  } catch (e) {
    console.error("Rate fetch failed:", e);
  }
}

async function fetchCurrencyList() {
  try {
    const res  = await fetch("https://api.frankfurter.app/currencies");
    const data = await res.json();
    data["USD"] = "US Dollar";
    await chrome.storage.local.set({ currencies: data });
  } catch (e) {
    console.error("Currency list fetch failed:", e);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await fetchCurrencyList();
  await fetchRates();
});

chrome.runtime.onStartup.addListener(fetchRates);

chrome.alarms.create("refreshRates",      { periodInMinutes: 60   });
chrome.alarms.create("refreshCurrencies", { periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "refreshRates")      fetchRates();
  if (alarm.name === "refreshCurrencies") fetchCurrencyList();
});

chrome.storage.onChanged.addListener(changes => {
  if (!changes.targetCurrency) return;
  const code = changes.targetCurrency.newValue;
  chrome.storage.local.get("allRates", ({ allRates }) => {
    if (allRates && code) {
      chrome.storage.local.set({ usdRate: allRates[code] ?? 1 });
    } else {
      fetchRates();
    }
  });
});