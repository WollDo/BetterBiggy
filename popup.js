const SYMBOLS = {
  USD:"$",  GBP:"\u00a3", EUR:"\u20ac", JPY:"\u00a5", CAD:"CA$", AUD:"A$",
  CHF:"Fr", CNY:"\u00a5", HKD:"HK$",   SGD:"S$",     SEK:"kr",  NOK:"kr",
  DKK:"kr", NZD:"NZ$",   MXN:"MX$",   BRL:"R$",     INR:"\u20b9", KRW:"\u20a9",
  ZAR:"R",  TRY:"\u20ba", PLN:"z\u0142", CZK:"K\u010d", HUF:"Ft", ILS:"\u20aa",
  AED:"\u062f.\u0625", THB:"\u0e3f", MYR:"RM", PHP:"\u20b1", IDR:"Rp"
};

const PINNED = ["GBP", "EUR", "USD"];

let allCurrencies = {};
let allRates      = {};
let btcUsd        = null;
let targetCurrency = null;

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

// ── Freshness ────────────────────────────────────────────────────────────────
function setFreshness(lastUpdated) {
  const dot   = document.getElementById("fDot");
  const label = document.getElementById("fLabel");
  if (!lastUpdated) { label.textContent = "no rates"; return; }
  const mins = Math.floor((Date.now() - lastUpdated) / 60000);
  const cls  = mins < 60 ? "fresh" : mins < 120 ? "stale" : "old";
  const text = mins < 1 ? "live" : mins < 60 ? mins + "m ago" : Math.floor(mins / 60) + "h ago";
  dot.className = "f-dot " + cls;
  label.textContent = text;
}

// ── Selected-currency header ─────────────────────────────────────────────────
function updateSelBlock() {
  const block = document.getElementById("selBlock");
  const val   = document.getElementById("selValue");
  const lbl   = document.getElementById("selLabel");
  if (!targetCurrency || !btcUsd || !allRates[targetCurrency]) {
    block.style.display = "none";
    return;
  }
  block.style.display = "block";
  val.textContent = btcToLocal(targetCurrency);
  lbl.textContent = "1 BTC in " + targetCurrency;
}

// ── Progress strip ───────────────────────────────────────────────────────────
function updateProgress(progress) {
  const strip = document.getElementById("progressStrip");
  const fill  = document.getElementById("progressFill");
  if (!progress) { strip.classList.remove("visible"); return; }
  const { done, total } = progress;
  strip.classList.add("visible");
  fill.style.width = (total > 0 ? (done / total) * 100 : 0) + "%";
  if (done >= total) setTimeout(() => strip.classList.remove("visible"), 1400);
}

// ── Render list ──────────────────────────────────────────────────────────────
function makeItem(code, name) {
  const active = code === targetCurrency ? "active" : "";
  const val    = btcToLocal(code);
  return '<div class="c-item ' + active + '" data-code="' + code + '">' +
    '<span class="c-code">' + code + '</span>' +
    '<span class="c-name">' + name + '</span>' +
    '<span class="c-val">'  + val  + '</span>' +
    '</div>';
}

function renderList(filter) {
  filter = (filter || "").toLowerCase();
  const list = document.getElementById("currencyList");

  const matching = Object.entries(allCurrencies).filter(([code, name]) =>
    code.toLowerCase().includes(filter) || name.toLowerCase().includes(filter)
  );

  if (matching.length === 0) {
    list.innerHTML = '<div class="no-results">No currencies found</div>';
    return;
  }

  let html = "";

  if (!filter) {
    const pinned = matching.filter(([c]) => PINNED.includes(c)).sort(pinnedSort);
    const rest   = matching.filter(([c]) => !PINNED.includes(c)).sort(([a],[b]) => a.localeCompare(b));

    html += '<div class="sec-head">Popular</div>';
    html += pinned.map(([c, n]) => makeItem(c, n)).join("");
    if (rest.length) {
      html += '<div class="sec-div"></div><div class="sec-head">All currencies</div>';
      html += rest.map(([c, n]) => makeItem(c, n)).join("");
    }
  } else {
    html += [...matching].sort(pinnedSort).map(([c, n]) => makeItem(c, n)).join("");
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

// ── Init ─────────────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener(changes => {
  if (changes.convProgress) updateProgress(changes.convProgress.newValue);
});

chrome.storage.local.get(
  ["currencies", "targetCurrency", "btcUsd", "allRates", "lastUpdated", "convProgress"],
  data => {
    allCurrencies  = data.currencies  ?? {};
    targetCurrency = data.targetCurrency ?? null;
    btcUsd         = data.btcUsd     ?? null;
    allRates       = data.allRates   ?? {};

    if (btcUsd) {
      document.getElementById("btcPrice").textContent = "$" + btcUsd.toLocaleString();
    }

    setFreshness(data.lastUpdated ?? null);
    updateSelBlock();
    if (data.convProgress) updateProgress(data.convProgress);

    renderList("");

    setTimeout(() => {
      const active = document.querySelector(".c-item.active");
      if (active) active.scrollIntoView({ block: "center" });
    }, 50);
  }
);

document.getElementById("search").addEventListener("input", e => renderList(e.target.value));
document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

// Auto-focus search when popup opens
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search").focus();
});