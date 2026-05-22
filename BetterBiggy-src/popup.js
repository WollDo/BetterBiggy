const SYMBOLS = {
  USD:"$",  GBP:"\u00a3", EUR:"\u20ac", JPY:"\u00a5", CAD:"CA$", AUD:"A$",
  CHF:"Fr", CNY:"\u00a5", HKD:"HK$",   SGD:"S$",     SEK:"kr",  NOK:"kr",
  DKK:"kr", NZD:"NZ$",   MXN:"MX$",   BRL:"R$",     INR:"\u20b9", KRW:"\u20a9",
  ZAR:"R",  TRY:"\u20ba", PLN:"z\u0142", CZK:"K\u010d", HUF:"Ft", ILS:"\u20aa",
  AED:"\u062f.\u0625", THB:"\u0e3f", MYR:"RM", PHP:"\u20b1", IDR:"Rp"
};

const PINNED = ["GBP", "EUR", "USD"];

let allCurrencies  = {};
let allRates       = {};
let btcUsd         = null;
let targetCurrency = null;
let darkMode       = true;

function getSymbol(code) { return SYMBOLS[code] ?? code + " "; }

function pinnedSort([a], [b]) {
  const ai = PINNED.indexOf(a), bi = PINNED.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
}

function btcToLocal(code) {
  if (!btcUsd || !allRates[code]) return "";
  const val = btcUsd * allRates[code];
  return getSymbol(code) + val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function setFreshness(lastUpdated) {
  const dot = document.getElementById("fDot");
  const lbl = document.getElementById("fLabel");
  if (!lastUpdated) { lbl.textContent = "no rates"; return; }
  const mins = Math.floor((Date.now() - lastUpdated) / 60000);
  dot.className = "f-dot " + (mins < 60 ? "fresh" : mins < 120 ? "stale" : "old");
  lbl.textContent = mins < 1 ? "live" : mins < 60 ? mins + "m ago" : Math.floor(mins/60) + "h ago";
}

function updateSelBlock() {
  const block = document.getElementById("selBlock");
  if (!targetCurrency || !btcUsd || !allRates[targetCurrency]) { block.style.display = "none"; return; }
  block.style.display = "block";
  document.getElementById("selValue").textContent = btcToLocal(targetCurrency);
  document.getElementById("selLabel").textContent = "1 BTC in " + targetCurrency;
}

function updateProgress(progress) {
  const strip = document.getElementById("progressStrip");
  const fill  = document.getElementById("progressFill");
  if (!progress) { strip.classList.remove("visible"); return; }
  strip.classList.add("visible");
  fill.style.width = (progress.total > 0 ? (progress.done / progress.total) * 100 : 0) + "%";
  if (progress.done >= progress.total) setTimeout(() => strip.classList.remove("visible"), 1400);
}

function makeItem(code, name) {
  const active = code === targetCurrency ? "active" : "";
  return '<div class="c-item ' + active + '" data-code="' + code + '">' +
    '<span class="c-code">' + code + '</span>' +
    '<span class="c-name">' + name + '</span>' +
    '<span class="c-val">'  + btcToLocal(code) + '</span>' +
    '</div>';
}

function renderList(filter) {
  filter = (filter || "").toLowerCase();
  const list = document.getElementById("currencyList");
  const matching = Object.entries(allCurrencies).filter(([c, n]) =>
    c.toLowerCase().includes(filter) || n.toLowerCase().includes(filter)
  );
  if (!matching.length) { list.innerHTML = '<div class="no-results">No currencies found</div>'; return; }

  let html = "";
  if (!filter) {
    const pinned = matching.filter(([c]) => PINNED.includes(c)).sort(pinnedSort);
    const rest   = matching.filter(([c]) => !PINNED.includes(c)).sort(([a],[b]) => a.localeCompare(b));
    html += '<div class="sec-head">Popular</div>' + pinned.map(([c,n]) => makeItem(c,n)).join("");
    if (rest.length) html += '<div class="sec-div"></div><div class="sec-head">All currencies</div>' + rest.map(([c,n]) => makeItem(c,n)).join("");
  } else {
    html = [...matching].sort(pinnedSort).map(([c,n]) => makeItem(c,n)).join("");
  }

  list.innerHTML = html;
  list.querySelectorAll(".c-item").forEach(el =>
    el.addEventListener("click", () => selectCurrency(el.dataset.code))
  );
}

function selectCurrency(code) {
  targetCurrency = code;
  chrome.storage.local.set({ targetCurrency: code });
  updateSelBlock();
  renderList(document.getElementById("search").value);
  const active = document.querySelector(".c-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function applyTheme(isDark) {
  darkMode = isDark;
  chrome.storage.local.set({ darkMode: isDark });
  document.getElementById("themeDark").classList.toggle("active", isDark);
  document.getElementById("themeLight").classList.toggle("active", !isDark);
}

document.getElementById("themeDark").addEventListener("click",  () => applyTheme(true));
document.getElementById("themeLight").addEventListener("click", () => applyTheme(false));
document.getElementById("search").addEventListener("input", e => renderList(e.target.value));
document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

chrome.storage.onChanged.addListener(changes => {
  if (changes.convProgress) updateProgress(changes.convProgress.newValue);
});

chrome.storage.local.get(
  ["currencies", "targetCurrency", "btcUsd", "allRates", "lastUpdated", "convProgress", "darkMode", "onboarded"],
  data => {
    // First run — open onboarding page
    if (!data.onboarded) {
      chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
      window.close();
      return;
    }
    allCurrencies  = data.currencies  ?? {};
    targetCurrency = data.targetCurrency ?? null;
    btcUsd         = data.btcUsd     ?? null;
    allRates       = data.allRates   ?? {};
    darkMode       = data.darkMode   !== false;

    if (btcUsd) document.getElementById("btcPrice").textContent = "$" + btcUsd.toLocaleString();
    setFreshness(data.lastUpdated ?? null);
    updateSelBlock();
    if (data.convProgress) updateProgress(data.convProgress);

    document.getElementById("themeDark").classList.toggle("active", darkMode);
    document.getElementById("themeLight").classList.toggle("active", !darkMode);

    renderList("");
    setTimeout(() => {
      const active = document.querySelector(".c-item.active");
      if (active) active.scrollIntoView({ block: "center" });
    }, 50);
  }
);