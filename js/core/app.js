/* =========================================================================
   App namespace + page registry
   Loads first. Every other file attaches to window.App. Classic scripts
   (not modules) so the project still works when index.html is opened
   straight from disk with no server.

   Pages: each file in js/pages/ calls App.pages.define() with its own
   markup. App.pages.mount() (js/pages/pages-mount.js) then puts every page
   into the document BEFORE the rest of the scripts run, so the older files
   can keep looking their elements up by id at load time.
   ========================================================================= */
(function(){
  'use strict';

  window.App = {
    version: '0.2.0-dev',
    util: {},
    cfg: {},
    audio: {},
    canvas: {},
    modes: {},
    games: {},
    state: {},
    player: {},
    theme: {},
    pages: {}
  };

  var P = App.pages;
  P.list = [];
  P.current = null;

  // def: { label, html, init()? }   init runs once, from main.js, after every script has loaded
  P.define = function(id, def){
    def.id = id;
    P.list.push(def);
  };

  P.mount = function(){
    var host = document.getElementById('pages');
    var tabs = document.getElementById('pageTabs');
    P.list.forEach(function(def){
      var sec = document.createElement('section');
      sec.className = 'page';
      sec.id = 'page-' + def.id;
      sec.setAttribute('role', 'tabpanel');
      sec.setAttribute('aria-labelledby', 'tab-' + def.id);
      sec.hidden = true;
      sec.innerHTML = def.html;
      host.appendChild(sec);
      def.el = sec;

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab-btn';
      b.id = 'tab-' + def.id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'page-' + def.id);
      if (App.icons) b.innerHTML = App.icons.label('page-' + def.id, def.label); else b.textContent = def.label;
      b.addEventListener('click', function(){ P.show(def.id); });
      tabs.appendChild(b);
      def.tab = b;
    });
    var saved = null;
    try { saved = localStorage.getItem('viz.page'); } catch (e) {}
    P.show(P.list.some(function(d){ return d.id === saved; }) ? saved : P.list[0].id);
  };

  P.show = function(id){
    P.list.forEach(function(def){
      var on = def.id === id;
      def.el.hidden = !on;
      def.tab.classList.toggle('active', on);
      def.tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    P.current = id;
    try { localStorage.setItem('viz.page', id); } catch (e) {}
  };

  P.initAll = function(){
    P.list.forEach(function(def){ if (def.init) def.init(def.el); });
  };
})();
