(function() {
  // Find the manifest-injected betterbiggy.css stylesheet and toggle it
  function getSheet() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      try {
        var href = document.styleSheets[i].href || '';
        if (href.includes('betterbiggy.css')) return document.styleSheets[i];
      } catch(e) {}
    }
    return null;
  }

  function setDark(isDark) {
    var sheet = getSheet();
    if (sheet) sheet.disabled = !isDark;
    // Also toggle early style
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