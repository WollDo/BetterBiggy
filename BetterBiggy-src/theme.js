// theme.js — runs at document_start (early) and document_end (toggle+imagesize)
// Split into two self-invoking blocks so Chrome can run this file at both stages.

// BLOCK 1: document_start — instant dark background to prevent white flash
(function() {
  var s = document.createElement('style');
  s.id = 'bb-early';
  s.textContent = 'html,body{background:#0d0d0d!important;color:#c8c8c8!important}' +
    '#header{background:#0d0d0d!important}#content,#wonderwall{background:#0d0d0d!important}';
  (document.head || document.documentElement).appendChild(s);
  chrome.storage.local.get('darkMode', function(data) {
    if (data.darkMode === false) {
      var el = document.getElementById('bb-early');
      if (el) el.remove();
    }
  });
})();

// BLOCK 2: dark/light toggle + image size (runs at document_end)
(function() {
  function getSheet() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      try {
        if ((document.styleSheets[i].href || '').includes('betterbiggy.css'))
          return document.styleSheets[i];
      } catch(e) {}
    }
    return null;
  }

  function setDark(isDark) {
    var sheet = getSheet();
    if (sheet) sheet.disabled = !isDark;
    var early = document.getElementById('bb-early');
    if (early) early.disabled = !isDark;
  }

  function applyImageSize(pct) {
    var px = Math.round((pct / 50) * 500 * (window.innerHeight / 1080));
    var id = 'bb-imgsize';
    var el = document.getElementById(id) || document.createElement('style');
    el.id = id;
    el.textContent = [
      '.item-image{max-height:' + px + 'px!important;overflow:hidden!important}',
      '.item-image img{width:100%!important;max-height:' + px + 'px!important;height:auto!important;object-fit:contain!important}',
      '[data-carousel="slide"]{max-height:' + px + 'px!important;overflow:hidden!important}',
      '[data-carousel="slide"] img{width:100%!important;max-height:' + px + 'px!important;height:auto!important;object-fit:contain!important}',
      '[data-carousel="viewport"],[data-carousel="main"]{max-height:' + px + 'px!important}'
    ].join(' ');
    if (!document.getElementById(id)) document.head.appendChild(el);
  }

  chrome.storage.local.get(['darkMode', 'imageSize'], function(data) {
    setDark(data.darkMode !== false);
    applyImageSize(data.imageSize ?? 50);
  });

  chrome.storage.onChanged.addListener(function(changes, area) {
    if (area !== 'local') return;
    if (changes.darkMode) setDark(changes.darkMode.newValue !== false);
    if (changes.imageSize) applyImageSize(changes.imageSize.newValue);
  });
})();