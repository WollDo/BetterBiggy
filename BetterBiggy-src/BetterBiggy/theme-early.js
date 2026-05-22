// Injected at document_start — prevents white flash before full theme loads
// Defaults to dark immediately, removes itself if user chose light mode
(function() {
  var s = document.createElement('style');
  s.id = 'bb-early';
  s.textContent = 'html,body{background:#0d0d0d!important;color:#c8c8c8!important}' +
    '#header{background:#0d0d0d!important}' +
    '#content,#wonderwall{background:#0d0d0d!important}';
  (document.head || document.documentElement).appendChild(s);

  chrome.storage.local.get('darkMode', function(data) {
    if (data.darkMode === false) {
      var el = document.getElementById('bb-early');
      if (el) el.remove();
    }
  });
})();