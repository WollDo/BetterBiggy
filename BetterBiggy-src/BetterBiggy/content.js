const SYMBOLS = {
  USD:"$", GBP:"\u00a3", EUR:"\u20ac", JPY:"\u00a5", CAD:"CA$", AUD:"A$",
  CHF:"Fr", CNY:"\u00a5", HKD:"HK$", SGD:"S$", SEK:"kr", NOK:"kr",
  DKK:"kr", NZD:"NZ$", MXN:"MX$", BRL:"R$", INR:"\u20b9", KRW:"\u20a9",
  ZAR:"R", TRY:"\u20ba", PLN:"z\u0142", CZK:"K\u010d", HUF:"Ft", ILS:"\u20aa",
  AED:"\u062f.\u0625", THB:"\u0e3f", MYR:"RM", PHP:"\u20b1", IDR:"Rp"
};

const BATCH_SIZE = 100;
const BATCH_DELAY = 16;

function getSymbol(code) {
  return SYMBOLS[code] ?? code + " ";
}

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

function clearConverted() {
  document.querySelectorAll('span.price.USD[data-converted]').forEach(el => {
    delete el.dataset.converted;
  });
}

let observer;
let conversionId = 0; // increment to cancel any running conversion

function processQueue(id, pairs, btcUsd, usdRate, targetCurrency, offset, total) {
  // If a newer conversion has started, stop immediately
  if (id !== conversionId) return;

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
    setTimeout(() => processQueue(id, pairs, btcUsd, usdRate, targetCurrency, offset + BATCH_SIZE, total), BATCH_DELAY);
  } else {
    setTimeout(() => {
      if (id === conversionId) chrome.storage.local.remove("convProgress");
    }, 1500);
  }
}

function startConversion(btcUsd, usdRate, targetCurrency) {
  // Cancel any running conversion by bumping the ID
  const id = ++conversionId;

  if (observer) observer.disconnect();

  const pairs = getPairs();
  if (pairs.length === 0) {
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
    return;
  }

  chrome.storage.local.set({ convProgress: { done: 0, total: pairs.length } });
  processQueue(id, pairs, btcUsd, usdRate, targetCurrency, 0, pairs.length);

  // Reconnect observer after first batch has a chance to start
  setTimeout(() => {
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }, 50);
}

function getAndConvert() {
  chrome.storage.local.get(["targetCurrency", "btcUsd", "usdRate"], ({ targetCurrency, btcUsd, usdRate }) => {
    if (!targetCurrency || !btcUsd || !usdRate) return;
    startConversion(btcUsd, usdRate, targetCurrency);
  });
}

// Initial conversion on page load
chrome.storage.local.get(["targetCurrency", "btcUsd", "usdRate"], ({ targetCurrency, btcUsd, usdRate }) => {
  if (!targetCurrency || !btcUsd || !usdRate) return;

  startConversion(btcUsd, usdRate, targetCurrency);

  let mutationDebounce;
  observer = new MutationObserver((mutations) => {
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
    mutationDebounce = setTimeout(getAndConvert, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let scrollDebounce;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(getAndConvert, 600);
  }, { passive: true });
});

// Re-convert immediately when currency changes in the popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!changes.targetCurrency && !changes.usdRate && !changes.btcUsd) return;
  clearConverted();
  getAndConvert();
});

// Add placeholder hint to the keyword search input
function patchSearchInput() {
  document.querySelectorAll('input[data-search-is-active="false"]').forEach(input => {
    if (!input.dataset.bbHinted) {
      input.placeholder = "click keyword to search";
      input.dataset.bbHinted = "true";
    }
  });
}

patchSearchInput();


// Fix dark inline text colors that are invisible on dark background
function fixInlineColors() {
  document.querySelectorAll('[style*="color"]').forEach(el => {
    const s = el.getAttribute('style') || '';
    // Match rgba/rgb with low brightness values (dark text meant for white bg)
    const m = s.match(/color\s*:\s*rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return;
    const lum = (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255;
    if (lum < 0.4) {
      el.style.setProperty('color', '#c0c0c0', 'important');
    }
  });
}

fixInlineColors();
setTimeout(fixInlineColors, 800);

// ── Header nav hierarchy ─────────────────────────────────────
// #header-user-nav = 0 for sale / settings / logout / help → muted
// .header-primo    = topics / people / items               → orange + big
function styleHeaderNav() {
  const userNav = document.getElementById('header-user-nav');
  if (userNav) {
    userNav.querySelectorAll('a').forEach(function(a) {
      a.style.setProperty('color', '#555', 'important');
      a.style.setProperty('font-size', '11px', 'important');
      a.style.setProperty('font-weight', '400', 'important');
    });
  }

  const primo = document.querySelector('.header-primo');
  if (primo) {
    primo.querySelectorAll('a').forEach(function(a) {
      a.style.setProperty('color', '#f7931a', 'important');
      a.style.setProperty('font-size', '17px', 'important');
      a.style.setProperty('font-weight', '700', 'important');
    });
  }
}

styleHeaderNav();
setTimeout(styleHeaderNav, 500);
setTimeout(styleHeaderNav, 1500);