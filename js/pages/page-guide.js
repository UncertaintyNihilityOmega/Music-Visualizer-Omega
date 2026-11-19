/* =========================================================================
   PAGE: Guide
   A short, plain-words explanation of how sound becomes a picture here,
   a live read-out of the numbers the engine is producing right now, and
   the keyboard shortcuts. The longer version is docs/HOW-IT-WORKS.md.
   ========================================================================= */
App.pages.define('guide', {
  label: 'Guide',
  html:
    '<div class="card">' +
      '<div class="settings-head"><span>How music becomes a picture</span></div>' +
      '<ol class="steps">' +
        '<li><b>Listen.</b> About 60 times a second the app takes the last 46 thousandths of a second of sound.</li>' +
        '<li><b>Split it by pitch.</b> A piece of maths (the FFT) answers one question for 1,024 different pitches: how much of this pitch is in the sound right now? Low pitches are bass and kick drums, middle ones are voices and guitars, high ones are cymbals.</li>' +
        '<li><b>Group the pitches</b> into six bands, from the deepest bass to the airy top.</li>' +
        '<li><b>Tidy the numbers.</b> Turn a quiet song up and a loud one down, throw away hiss below a floor, then stretch what is left so loud really looks loud.</li>' +
        '<li><b>Smooth them</b> so things rise fast and fall slowly. Without this every bar would flicker.</li>' +
        '<li><b>Spot the hits.</b> When a band suddenly jumps above its own recent average, that is a beat, a snare or a hi-hat.</li>' +
        '<li><b>Draw.</b> Each mode maps those numbers to something you can see: a bar\'s height, the wind in the rain, the size of a flame.</li>' +
      '</ol>' +
      '<p class="page-text"><b>Piano mode plays piano.</b> There you hear piano notes for the notes the app finds in the song, not the song itself, and each one sounds as it lands on its key; a touched key plays too. To hear the song: Settings, Piano, switch off "Play piano notes instead of the song".</p>' +
      '<p class="page-text">So when a mode looks wrong, ask which step is off. Bars stuck at the top: step 4 (lower Sensitivity or raise the Noise floor in Settings). Flickering: step 5 (raise FFT smoothing or lower Fall speed). Missing the beat: step 6 (lower the Beat threshold).</p>' +
    '</div>' +
    '<div class="card">' +
      '<div class="settings-head"><span>Live numbers</span><span class="muted" id="meterSrc"></span></div>' +
      '<div class="meters" id="meters"></div>' +
      '<p class="url-hint">These are the exact values every mode and game is reading at this moment.</p>' +
    '</div>' +
    '<div class="card">' +
      '<div class="settings-head"><span>Keys</span></div>' +
      '<div class="table-wrap"><table class="info-table keys">' +
        '<tr><td><kbd>Space</kbd></td><td>play / pause</td></tr>' +
        '<tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>back / forward 5 seconds (with <kbd>Shift</kbd>: previous / next song)</td></tr>' +
        '<tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>volume</td></tr>' +
        '<tr><td><kbd>V</kbd></td><td>next visual</td></tr>' +
        '<tr><td><kbd>1</kbd>–<kbd>9</kbd></td><td>jump to a visual (in a game: buy / pick)</td></tr>' +
        '<tr><td><kbd>F</kbd></td><td>fullscreen</td></tr>' +
        '<tr><td>tap</td><td>in fullscreen, a tap on the picture pauses or plays (in Piano, a tap on the keys plays the key)</td></tr>' +
        '<tr><td><kbd>S</kbd></td><td>settings</td></tr>' +
        '<tr><td><kbd>M</kbd></td><td>mute</td></tr>' +
        '<tr><td><kbd>P</kbd></td><td>pause a game</td></tr>' +
      '</table></div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="settings-head"><span>About</span></div>' +
      '<p class="page-text">Music Visualiser Omega <span id="aboutVersion"></span>. Free to use, change and share with credit. Written by Claude, Anthropic\'s AI, for UncertaintyNihilityOmega: it can contain mistakes, and reports are welcome.</p>' +
      '<p class="page-text"><a href="https://github.com/UncertaintyNihilityOmega/Music-Visualizer-Omega" target="_blank" rel="noopener">Source and issue tracker on GitHub</a></p>' +
    '</div>',

  init: function(el){
    var A = App.audio.A, Aud = App.audio;
    document.getElementById('aboutVersion').textContent = 'v' + App.version;
    var names = [
      ['sub', 'Sub bass  20–60 Hz'], ['bass', 'Bass  60–180 Hz'], ['lowMid', 'Low mid  180–500 Hz'],
      ['mid', 'Mid  500–2,000 Hz'], ['high', 'Treble  2–6 kHz'], ['air', 'Air  6–14 kHz'],
      ['level', 'Level (overall)'], ['energy', 'Energy (slow)'], ['punch', 'Beat punch'],
      ['kick', 'Kick'], ['snare', 'Snare'], ['hat', 'Hi-hat']
    ];
    var host = document.getElementById('meters'), fills = [];
    names.forEach(function(n){
      var row = document.createElement('div');
      row.className = 'meter';
      var lab = document.createElement('span');
      lab.textContent = n[1];
      var bar = document.createElement('span');
      bar.className = 'meter-bar';
      var fill = document.createElement('i');
      bar.appendChild(fill);
      row.appendChild(lab);
      row.appendChild(bar);
      host.appendChild(row);
      fills.push(fill);
    });
    var src = document.getElementById('meterSrc');
    // a timer, not an animation frame: it must only cost anything while this page is open
    setInterval(function(){
      if (el.hidden) return;
      for (var i = 0; i < names.length; i++){
        fills[i].style.width = Math.round(Math.max(0, Math.min(1, A[names[i][0]])) * 100) + '%';
      }
      src.textContent = Aud.source === 'mic' ? 'microphone' : (Aud.isLive() ? 'music' : 'idle preview');
    }, 80);
  }
});
