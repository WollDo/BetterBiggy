const SYMBOLS = {
  USD:"$",  GBP:"\u00a3", EUR:"\u20ac", JPY:"\u00a5", CAD:"CA$", AUD:"A$",
  CHF:"Fr", CNY:"\u00a5", HKD:"HK$",   SGD:"S$",     SEK:"kr",  NOK:"kr",
  DKK:"kr", NZD:"NZ$",   MXN:"MX$",   BRL:"R$",     INR:"\u20b9", KRW:"\u20a9",
  ZAR:"R",  TRY:"\u20ba", PLN:"z\u0142", CZK:"K\u010d", HUF:"Ft", ILS:"\u20aa",
  AED:"\u062f.\u0625", THB:"\u0e3f", MYR:"RM", PHP:"\u20b1", IDR:"Rp"
};

const PINNED = ["GBP", "EUR", "USD"];

let allCurrencies  = {};
let targetCurrency = null;
let darkMode       = true;

function getSymbol(c) { return SYMBOLS[c] ?? c + " "; }

function selectTheme(theme) {
  darkMode = theme === "dark";
  document.querySelectorAll(".theme-card").forEach(el => {
    el.classList.toggle("selected", el.dataset.theme === theme);
  });
}

function selectCurrency(code) {
  targetCurrency = code;
  renderList(document.getElementById("search").value);
  const info = document.getElementById("selInfo");
  const name = allCurrencies[code] ?? code;
  info.innerHTML = "Currency: <strong>" + code + "</strong> \u2014 " + name;
  document.getElementById("goBtn").disabled = false;
  const active = document.querySelector(".c-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
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
    const pinned = matching.filter(([c]) => PINNED.includes(c))
      .sort(([a],[b]) => PINNED.indexOf(a) - PINNED.indexOf(b));
    const rest = matching.filter(([c]) => !PINNED.includes(c))
      .sort(([a],[b]) => a.localeCompare(b));

    html += '<div class="sec-head">Popular</div>';
    html += pinned.map(([c,n]) => makeItem(c,n)).join("");
    if (rest.length) {
      html += '<div class="sec-head">All currencies</div>';
      html += rest.map(([c,n]) => makeItem(c,n)).join("");
    }
  } else {
    html += matching.sort(([a],[b]) => a.localeCompare(b)).map(([c,n]) => makeItem(c,n)).join("");
  }

  list.innerHTML = html;
  list.querySelectorAll(".c-item").forEach(el =>
    el.addEventListener("click", () => selectCurrency(el.dataset.code))
  );
}

function makeItem(code, name) {
  const active = code === targetCurrency ? "active" : "";
  return '<div class="c-item ' + active + '" data-code="' + code + '">' +
    '<span class="c-code">' + code + '</span>' +
    '<span class="c-name">' + name + '</span>' +
    '</div>';
}

function finish() {
  if (!targetCurrency) return;
  chrome.storage.local.set({ targetCurrency, darkMode, onboarded: true }, () => {
    chrome.tabs.create({ url: "https://littlebiggy.org/wall/items" });
    window.close();
  });
}

document.getElementById("search").addEventListener("input", e => renderList(e.target.value));

// Load currencies — retry if not ready yet
function load(attempts) {
  chrome.storage.local.get(["currencies", "targetCurrency", "darkMode"], data => {
    if (!data.currencies || Object.keys(data.currencies).length === 0) {
      if (attempts > 0) setTimeout(() => load(attempts - 1), 600);
      return;
    }
    allCurrencies  = data.currencies;
    targetCurrency = data.targetCurrency ?? null;
    if (data.darkMode === false) selectTheme("light");
    renderList("");
    if (targetCurrency) {
      document.getElementById("goBtn").disabled = false;
      const name = allCurrencies[targetCurrency] ?? targetCurrency;
      document.getElementById("selInfo").innerHTML =
        "Currency: <strong>" + targetCurrency + "</strong> \u2014 " + name;
      setTimeout(() => {
        const active = document.querySelector(".c-item.active");
        if (active) active.scrollIntoView({ block: "center" });
      }, 80);
    }
  });
}

load(10);

// Wire up theme cards and go button via addEventListener (CSP blocks inline onclick)
document.querySelectorAll('.theme-card').forEach(el => {
  el.addEventListener('click', () => selectTheme(el.dataset.theme));
});

document.getElementById('goBtn').addEventListener('click', finish);