# How music becomes a picture

For someone who has never looked inside a visualiser. Read this once and you will know which part to
suspect when a mode looks wrong. Each step names the file and the setting that controls it.

## The short version

Sound is air wobbling back and forth. A song file is a long list of numbers that says how far the air is pushed,
44,100 times every second. A visualiser reads a small slice of that list, works out **which pitches are in it and
how strong each one is**, tidies those strengths into a few numbers between 0 and 1, and then draws something
whose size, speed or colour follows those numbers. It does this about 60 times a second.

```
song or microphone
      |
 1. take a slice            the last 2,048 samples (46 thousandths of a second)
      |
 2. split by pitch (FFT)    1,024 strengths, one per pitch, low to high
      |
 3. group into bands        sub, bass, low mid, mid, treble, air
      |
 4. tidy the numbers        loudness curve, treble lift, auto level, noise floor, contrast
      |
 5. smooth over time        rise fast, fall slowly
      |
 6. spot the hits           beat, kick, snare, hi-hat, "something new started"
      |
 7. draw                    each mode maps the numbers to shapes
```

Steps 1 and 2 are done by the browser (the Web Audio API's `AnalyserNode`). Steps 3 to 6 are
`js/core/analysis.js`. Step 7 is one file per mode in `js/modes/`.

## Step by step

### 1. Take a slice
Every frame the app asks for the newest 2,048 samples. Short enough to react quickly, long enough to tell a low
note from a slightly lower one.

### 2. Split it by pitch
Any sound, however complicated, can be built by adding together plain tones (pure pitches) of different
strengths. The **Fourier transform** does the reverse: give it the slice and it says how strong each plain tone
is. The fast way of computing it is called the **FFT**. Out come 1,024 numbers called **bins**. Bin 0 is the
lowest pitch, bin 1,023 the highest, and each is about 21.5 Hz wide. Hz ("hertz") means wobbles per second: a
bass guitar's low note is about 40 Hz, a voice sits around 100 to 1,000 Hz, a cymbal is mostly above 5,000 Hz.

The browser reports each strength in **decibels** (dB), a scale where every step of 6 dB means "twice as strong".
The app tells it to cover -90 dB (silence) to -12 dB (as loud as a song gets) and squeezes that range into the
whole numbers 0 to 255.

### 3. Group into bands
1,024 numbers is too many to steer a picture with, so they are averaged into six bands:

| Band | Pitches | What usually lives there |
| --- | --- | --- |
| sub | 20 to 60 Hz | the rumble you feel more than hear |
| bass | 60 to 180 Hz | kick drum, bass guitar |
| low mid | 180 to 500 Hz | the body of guitars, pianos, low voices |
| mid | 500 to 2,000 Hz | voices, most melodies |
| treble | 2,000 to 6,000 Hz | the bite of snares, consonants in singing |
| air | 6,000 to 14,000 Hz | cymbals, hiss, sparkle |

Modes that draw many bars skip the bands and read the bins directly, spread across the screen.

### 4. Tidy the numbers
Raw strengths make poor pictures, for four reasons, each with its own fix. All four are sliders under
**Settings > Audio response**.

- **Decibels squash everything together.** Half as strong is only 6 dB lower, about 8% of a bar's height, so
  loud and quiet look almost the same. *Loud / quiet difference* undoes part of the squash. At the default (0.5) a
  sound half as strong draws about 30% shorter.
- **High notes are always weaker than bass.** Music loses roughly 4.5 dB for every doubling of pitch, so cymbals
  would hardly show next to a kick. *Treble lift* adds that much back per doubling.
- **Songs are recorded at different loudness.** *Auto level matching* watches the loudest recent moment and
  scales everything so that moment nearly fills the range. *Auto level memory* is how long it remembers: with 14
  seconds a quiet verse after a loud chorus still looks quiet, which is the point.
- **Hiss is not music.** Anything under the *Noise floor* is drawn as nothing, and the *Contrast curve* stretches
  what is left.

After this every band is a number from 0 (nothing) to 1 (as strong as it gets).

### 5. Smooth over time
The numbers jump around from frame to frame. Drawn directly, every bar would flicker. So each one **rises
quickly** toward a louder value and **falls slowly** toward a quieter one (*Rise speed*, *Fall speed*). That is
why a bar leaps up on a drum hit and then sinks.

Three slower versions are kept too: **level** (everything together), **intensity** (level plus how busy the
sound is) and **energy** (a few seconds of average, which tells a chorus from a verse).

### 6. Spot the hits
A drum hit is a sudden rise. The app keeps the last 0.7 seconds of a band and calls it a hit when the newest
value clears that recent average by a margin, then waits a moment so one drum is one hit.

- **beat**: the bass band jumps, or a kick lands on top of a held bass note.
- **kick, snare, hi-hat**: the same test on how much the low, middle and top of the spectrum *grew* since the
  last frame (this growth is called spectral flux).
- **onset**: the whole spectrum grew: something new started, whatever it was.

### 7. Draw
Every mode reads the same numbers and decides what they mean. In Basic, each bar's height is one slice of the
spectrum. In Rain, the wind follows the balance between treble and low mid, and a strong beat can throw
lightning. In Fire, flames sway with the bass and grow with intensity. Open the **Guide** page in the app to
watch the numbers move while a song plays.

## When something looks wrong

| What you see | Likely step | Try |
| --- | --- | --- |
| Everything stuck near the top | 4 | lower Sensitivity or Auto level matching |
| Almost nothing moves | 4 | raise Sensitivity, lower Noise floor |
| Quiet and loud parts look the same | 4 | raise Loud / quiet difference, lengthen Auto level memory |
| Only the bass moves | 4 | raise Treble lift |
| Flicker, jitter | 5 | raise FFT smoothing, lower Fall speed |
| Slow, laggy, mushy | 5 | lower FFT smoothing, raise Fall speed |
| Flashes miss the drums | 6 | lower Beat threshold |
| Flashes on everything | 6 | raise Beat threshold or Beat minimum level |
| Piano shows the wrong notes | 6 | see below |

## Why Piano can never be perfect
A piano note is not one pitch: it is a lowest pitch plus a stack of fainter higher ones (overtones), and a song
has several instruments and drums on top of each other. Piano mode uses a much finer split (16,384 samples, 2.7 Hz
per bin), looks for pitches that stand well above their neighbours, and discards those that are probably
overtones of a lower note. It is right often on clean music and guesses on dense music. A live sound also cannot
show notes *before* they play; that needs the whole song read in advance (item 6 in ROADMAP.md).

## Words used
- **Sample**: one number in the song file: how far the air is pushed at one instant.
- **Hz**: wobbles per second. Higher means a higher pitch.
- **FFT**: the calculation that splits a slice of sound into pitches.
- **Bin**: one of the FFT's results: the strength of one narrow range of pitch.
- **dB (decibel)**: a loudness scale. +6 dB is twice as strong, -6 dB is half.
- **Band**: several bins averaged together.
- **Envelope**: a smoothed version of a value that rises fast and falls slowly.
- **Onset**: the moment a new sound starts.
- **Spectral flux**: how much the spectrum grew since the previous frame.
