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

function getSymbol(code) { return SYMBOLS[code] ?? code; }

function btcToLocal(code) {
  if (!btcUsd || !allRates[code]) return "\u2014";
  const val = btcUsd * allRates[code];
  return getSymbol(code) + val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ── Freshness ────────────────────────────────────────────────────────────────
function setFreshness(lastUpdated) {
  const dot   = document.getElementById("fDot");
  const label = document.getElementById("lastUpdated");
  if (!lastUpdated) { label.textContent = "not fetched"; return; }
  const mins = Math.floor((Date.now() - lastUpdated) / 60000);
  const cls  = mins < 60 ? "fresh" : mins < 120 ? "stale" : "old";
  const text = mins < 1 ? "live" : mins < 60 ? mins + "m ago" : Math.floor(mins / 60) + "h ago";
  dot.className = "f-dot " + cls;
  label.textContent = text;
}

// ── Status bar ───────────────────────────────────────────────────────────────
function updateStatus() {
  const el = document.getElementById("statusText");
  if (!targetCurrency) { el.innerHTML = "No currency selected"; return; }
  const name = allCurrencies[targetCurrency] ?? targetCurrency;
  el.innerHTML = "Showing prices in <strong>" + targetCurrency + "</strong> \u2014 " + name;
}

// ── Pinned cards ─────────────────────────────────────────────────────────────
function renderPinned(filter) {
  const section = document.getElementById("pinnedSection");
  if (filter) { section.style.display = "none"; return; }
  section.style.display = "block";

  const row = document.getElementById("pinnedRow");
  row.innerHTML = PINNED.map(code => {
    const name   = allCurrencies[code] ?? code;
    const active = code === targetCurrency ? "active" : "";
    const rate   = btcToLocal(code);
    return '<div class="pinned-card ' + active + '" data-code="' + code + '">' +
      '<div class="p-top">' +
        '<span class="p-code">' + code + '</span>' +
        '<span class="p-symbol">' + getSymbol(code) + '</span>' +
      '</div>' +
      '<div class="p-name">' + name + '</div>' +
      '<div class="p-rate">' + rate + '</div>' +
      '<div class="p-rate-label">per BTC</div>' +
      '</div>';
  }).join("");

  row.querySelectorAll(".pinned-card").forEach(el =>
    el.addEventListener("click", () => selectCurrency(el.dataset.code))
  );
}

// ── Currency grid ─────────────────────────────────────────────────────────────
function renderGrid(filter) {
  filter = (filter || "").toLowerCase();
  const label = document.getElementById("gridLabel");
  const grid  = document.getElementById("grid");

  const entries = Object.entries(allCurrencies)
    .filter(([code, name]) =>
      code.toLowerCase().includes(filter) || name.toLowerCase().includes(filter)
    )
    .filter(([code]) => filter ? true : !PINNED.includes(code))
    .sort(([a], [b]) => a.localeCompare(b));

  label.textContent = filter ? "Results" : "All currencies";

  if (entries.length === 0) {
    grid.innerHTML = '<div class="no-results">No currencies match</div>';
    return;
  }

  grid.innerHTML = entries.map(([code, name]) => {
    const active = code === targetCurrency ? "active" : "";
    const rate   = btcToLocal(code);
    return '<div class="c-card ' + active + '" data-code="' + code + '">' +
      '<div class="card-top">' +
        '<span class="card-code">' + code + '</span>' +
        '<span class="card-sym">'  + getSymbol(code) + '</span>' +
      '</div>' +
      '<div class="card-name">' + name + '</div>' +
      '<div class="card-rate">' + rate + ' / BTC</div>' +
      '</div>';
  }).join("");

  grid.querySelectorAll(".c-card").forEach(el =>
    el.addEventListener("click", () => selectCurrency(el.dataset.code))
  );
}

// ── Select ───────────────────────────────────────────────────────────────────
function selectCurrency(code) {
  targetCurrency = code;
  chrome.storage.local.set({ targetCurrency: code });
  updateStatus();
  const filter = document.getElementById("search").value;
  renderPinned(filter);
  renderGrid(filter);
  const active = document.querySelector(".pinned-card.active, .c-card.active");
  if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Load ─────────────────────────────────────────────────────────────────────
function loadData() {
  chrome.storage.local.get(
    ["currencies", "targetCurrency", "btcUsd", "allRates", "lastUpdated", "imageSize"],
    data => {
      allCurrencies  = data.currencies  ?? {};
      targetCurrency = data.targetCurrency ?? null;
      btcUsd         = data.btcUsd     ?? null;
      allRates       = data.allRates   ?? {};
      const imgSize = data.imageSize ?? 50;
      document.getElementById("imageSizeSlider").value = imgSize;
      document.getElementById("imageSizeVal").textContent = imgSize + "%";

      if (btcUsd) {
        document.getElementById("btcPrice").textContent = "$" + btcUsd.toLocaleString();
      }

      setFreshness(data.lastUpdated ?? null);
      updateStatus();

      const filter = document.getElementById("search").value;
      renderPinned(filter);
      renderGrid(filter);

      setTimeout(() => {
        const active = document.querySelector(".pinned-card.active");
        if (active) active.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  );
}

document.getElementById("search").addEventListener("input", e => {
  renderPinned(e.target.value);
  renderGrid(e.target.value);
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  const btn = document.getElementById("refreshBtn");
  btn.textContent = "Refreshing\u2026";
  btn.disabled = true;
  // Trigger background re-fetch by re-writing targetCurrency
  chrome.storage.local.get("targetCurrency", ({ targetCurrency }) => {
    chrome.storage.local.set({ targetCurrency }, () => {
      setTimeout(() => {
        loadData();
        btn.textContent = "\u21BB Refresh rates";
        btn.disabled = false;
      }, 2200);
    });
  });
});

loadData();

document.getElementById('imageSizeSlider').addEventListener('input', function() {
  const val = parseInt(this.value);
  document.getElementById('imageSizeVal').textContent = val + '%';
  chrome.storage.local.set({ imageSize: val });
});
});