/* =========================================================================
   INSTALL + OFFLINE
   1. Registers the service worker (sw.js), which keeps a copy of the app's
      files so it opens with no network. Never on the local dev server,
      where a cached copy would hide every edit (add ?sw=1 to the address to
      test it there; without it any worker left from a test is removed).
   2. The "Install app" button on the Music page: Chrome, Edge and Android
      give the page an install prompt to show; Safari and Firefox do not, so
      there the button explains the browser's own menu.
   ========================================================================= */
(function(){
  'use strict';
  var I = App.install = { canPrompt: false, onChange: null };
  var promptEvent = null;

  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '';
  var wantsSW = !isLocal || /[?&]sw=1/.test(location.search);
  I.offlineReady = false;
  if ('serviceWorker' in navigator && location.protocol !== 'file:'){
    if (wantsSW){
      navigator.serviceWorker.register('sw.js').then(function(){
        return navigator.serviceWorker.ready;
      }).then(function(){ I.offlineReady = true; changed(); }).catch(function(){});
    } else {
      navigator.serviceWorker.getRegistrations().then(function(regs){
        regs.forEach(function(r){ r.unregister(); });
      }).catch(function(){});
    }
  }

  I.installed = function(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  };
  function changed(){ if (I.onChange) I.onChange(); }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();          // keep it for our own button
    promptEvent = e;
    I.canPrompt = true;
    changed();
  });
  window.addEventListener('appinstalled', function(){
    promptEvent = null;
    I.canPrompt = false;
    changed();
  });

  // Shows the browser's install prompt when there is one. Otherwise returns
  // the words that tell the user where their browser keeps the install command.
  I.install = function(){
    if (promptEvent){
      var ev = promptEvent;
      promptEvent = null;
      I.canPrompt = false;
      ev.prompt();
      if (ev.userChoice && ev.userChoice.then) ev.userChoice.then(changed, changed);
      return null;
    }
    return I.howTo();
  };
  I.howTo = function(){
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (location.protocol === 'file:' || isLocal) return 'Installing works from the published site (https), not from a file or the local test server.';
    if (ios) return 'On iPhone and iPad: tap the Share button (the square with an arrow), then "Add to Home Screen".';
    if (/Android/.test(ua)) return 'Open the browser menu (⋮) and tap "Install app" or "Add to Home screen".';
    if (/Firefox/.test(ua)) return 'Firefox on a computer cannot install web apps. Open this page in Chrome or Edge and use the install icon in the address bar.';
    return 'Use the install icon at the right end of the address bar, or the browser menu > "Install Music Visualiser Omega".';
  };
})();
