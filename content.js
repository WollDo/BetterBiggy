const SYMBOLS = {
  USD:"$", GBP:"£", EUR:"€", JPY:"¥", CAD:"CA$", AUD:"A$",
  CHF:"Fr", CNY:"¥", HKD:"HK$", SGD:"S$", SEK:"kr", NOK:"kr",
  DKK:"kr", NZD:"NZ$", MXN:"MX$", BRL:"R$", INR:"₹", KRW:"₩",
  ZAR:"R", TRY:"₺", PLN:"zł", CZK:"Kč", HUF:"Ft", ILS:"₪",
  AED:"د.إ", THB:"฿", MYR:"RM", PHP:"₱", IDR:"Rp"
};

const BATCH_SIZE = 10;
const BATCH_DELAY = 120;

function getSymbol(code) {
  return SYMBOLS[code] ?? code + " ";
}

// Walk up from btcEl until we find an ancestor that also contains
// span.price.USD. Handles pages where BTC is nested deeper than USD
// (e.g. inside a payment-methods div) as well as sibling layouts.
function findUsdSibling(btcEl) {
  let node = btcEl.parentElement;
  while (node && node !== document.body) {
    const usdEl = node.querySelector('span.price.USD');
    if (usdEl) return usdEl;
    node = node.parentElement;
  }
  return null;
}

function getPairs() {
  const pairs = [];
  document.querySelectorAll('span.price.BTC').forEach(btcEl => {
    const usdEl = findUsdSibling(btcEl);
    if (!usdEl || usdEl.dataset.converted) return;
    const raw = btcEl.textContent.replace(/[^0-9.]/g, '');
    const btc = parseFloat(raw);
    if (isNaN(btc)) return;
    pairs.push({ btcEl, usdEl, btc });
  });
  return pairs;
}

let observer;
let isConverting = false;

function processQueue(pairs, btcUsd, usdRate, targetCurrency, offset, total, onDone) {
  const symbol = getSymbol(targetCurrency);
  const batch = pairs.slice(offset, offset + BATCH_SIZE);

  batch.forEach(({ usdEl, btc }) => {
    const converted = (btc * btcUsd * usdRate).toFixed(2);
    usdEl.innerHTML = '<span class="currencySymbol">' + symbol + '</span>' + converted;
    usdEl.dataset.converted = "true";
  });

  const done = Math.min(offset + BATCH_SIZE, total);
  chrome.storage.local.set({ convProgress: { done, total } });

  if (done < total) {
    setTimeout(() => processQueue(pairs, btcUsd, usdRate, targetCurrency, offset + BATCH_SIZE, total, onDone), BATCH_DELAY);
  } else {
    setTimeout(() => {
      chrome.storage.local.remove("convProgress");
      if (onDone) onDone();
    }, 2000);
  }
}

function startConversion(btcUsd, usdRate, targetCurrency) {
  if (isConverting) return;
  const pairs = getPairs();
  if (pairs.length === 0) return;

  if (observer) observer.disconnect();
  isConverting = true;

  chrome.storage.local.set({ convProgress: { done: 0, total: pairs.length } });
  processQueue(pairs, btcUsd, usdRate, targetCurrency, 0, pairs.length, () => {
    isConverting = false;
    if (observer) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
}

chrome.storage.local.get(["targetCurrency", "btcUsd", "usdRate"], ({ targetCurrency, btcUsd, usdRate }) => {
  if (!targetCurrency || !btcUsd || !usdRate) return;

  startConversion(btcUsd, usdRate, targetCurrency);

  let mutationDebounce;
  observer = new MutationObserver((mutations) => {
    if (isConverting) return;
    const relevant = mutations.some(m =>
      [...m.addedNodes].some(n =>
        n.nodeType === Node.ELEMENT_NODE && (
          n.matches('span.price') ||
          n.querySelector('span.price') !== null
        )
      )
    );
    if (!relevant) return;
    clearTimeout(mutationDebounce);
    mutationDebounce = setTimeout(() => startConversion(btcUsd, usdRate, targetCurrency), 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let scrollDebounce;
  window.addEventListener('scroll', () => {
    if (isConverting) return;
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => startConversion(btcUsd, usdRate, targetCurrency), 600);
  }, { passive: true });
});

// ── Keyword search: make input directly clickable ────────────
// The site requires clicking the "keyword" button to activate the input.
// This intercepts clicks on the disabled input and triggers the button first.
document.addEventListener('click', function(e) {
  const input = e.target.closest('input[data-search-is-active="false"]');
  if (!input) return;

  // Find the keyword button — walk up to the filter container then search
  const filterBar = input.closest('[class*="filters_"]') ??
                    input.closest('[class*="wall_"]') ??
                    document.querySelector('[class*="filters_button-filters"]');

  const btn = filterBar
    ? [...filterBar.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'keyword')
    : [...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'keyword');

  if (btn) {
    btn.click();
    setTimeout(() => {
      const active = document.querySelector('input[data-search-is-active="true"]') ?? input;
      active.focus();
    }, 80);
  }
}, true);