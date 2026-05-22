const SYMBOLS = {
  USD:"$",  GBP:"\u00a3", EUR:"\u20ac", JPY:"\u00a5", CAD:"CA$", AUD:"A$",
  CHF:"Fr", CNY:"\u00a5", HKD:"HK$",   SGD:"S$",     SEK:"kr",  NOK:"kr",
  DKK:"kr", NZD:"NZ$",   MXN:"MX$",   BRL:"R$",     INR:"\u20b9", KRW:"\u20a9",
  ZAR:"R",  TRY:"\u20ba", PLN:"z\u0142", CZK:"K\u010d", HUF:"Ft", ILS:"\u20aa",
  AED:"\u062f.\u0625", THB:"\u0e3f", MYR:"RM", PHP:"\u20b1", IDR:"Rp"
};

const PINNED = ["GBP", "EUR", "USD"];
let allCurrencies = {};
let selectedCurrency = null;
let selectedTheme = "dark";

function getSymbol(c) { return SYMBOLS[c] ?? c + " "; }

// Theme selection
document.querySelectorAll(".theme-card").forEach(card => {
  card.addEventListener("click", () => {
    selectedTheme = card.dataset.theme;
    document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
  });
});

// Step navigation
document.getElementById("toStep2").addEventListener("click", () => {
  document.getElementById("step1").classList.remove("active");
  document.getElementById("step2").classList.add("active");
  document.getElementById("search").focus();
});

document.getElementById("toStep1").addEventListener("click", () => {
  document.getElementById("step2").classList.remove("active");
  document.getElementById("step1").classList.add("active");
});

// Currency list
function makeItem(code, name) {
  const active = code === selectedCurrency ? "active" : "";
  return '<div class="c-item ' + active + '" data-code="' + code + '">' +
    '<span class="c-code">' + code + '</span>' +
    '<span class="c-name">' + name + '</span>' +
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
    const pinned = matching.filter(([c]) => PINNED.includes(c))
      .sort(([a],[b]) => PINNED.indexOf(a) - PINNED.indexOf(b));
    const rest = matching.filter(([c]) => !PINNED.includes(c))
      .sort(([a],[b]) => a.localeCompare(b));
    html += '<div class="sec-head">Popular</div>' + pinned.map(([c,n]) => makeItem(c,n)).join("");
    if (rest.length) html += '<div class="sec-head">All currencies</div>' + rest.map(([c,n]) => makeItem(c,n)).join("");
  } else {
    html = matching.sort(([a],[b]) => a.localeCompare(b)).map(([c,n]) => makeItem(c,n)).join("");
  }

  list.innerHTML = html;
  list.querySelectorAll(".c-item").forEach(el =>
    el.addEventListener("click", () => selectCurrency(el.dataset.code))
  );
}

function selectCurrency(code) {
  selectedCurrency = code;
  renderList(document.getElementById("search").value);
  const name = allCurrencies[code] ?? code;
  document.getElementById("selInfo").innerHTML = "<strong>" + code + "</strong> \u2014 " + name;
  document.getElementById("finish").disabled = false;
  const active = document.querySelector(".c-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

document.getElementById("search").addEventListener("input", e => renderList(e.target.value));

// Finish
document.getElementById("finish").addEventListener("click", () => {
  if (!selectedCurrency) return;
  chrome.storage.local.set({
    targetCurrency: selectedCurrency,
    darkMode: selectedTheme === "dark",
    onboarded: true
  }, () => window.close());
});

// Load currencies, retry if not ready yet
function load(attempts) {
  chrome.storage.local.get(["currencies"], data => {
    if (!data.currencies || !Object.keys(data.currencies).length) {
      if (attempts > 0) setTimeout(() => load(attempts - 1), 600);
      return;
    }
    allCurrencies = data.currencies;
    renderList("");
  });
}

load(10);