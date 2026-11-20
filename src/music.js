// Original, browser-generated chiptune loops; no downloaded music files.
// Original, browser-generated loops; no downloaded music files.
// 每個「配樂風格」都有四段場景曲：adventure（冒險準備）、battle（對戰）、victory（勝利）、rest（落敗休息）。
const CHIP = {
  adventure: { bpm: 112, melody: [76,0,79,81,79,0,76,74,72,0,76,79,74,0,0,0, 74,0,77,79,77,0,74,72,71,0,74,77,72,0,0,0], roots: [48,48,53,55], chords: [[0,4,7],[0,4,7],[0,4,7],[0,4,7]] },
  battle: { bpm: 144, melody: [76,0,76,79,83,81,79,78,76,0,74,76,79,0,78,74, 72,0,72,76,79,78,76,74,71,74,78,81,79,78,74,0], roots: [40,48,45,47], chords: [[0,3,7],[0,4,7],[0,3,7],[0,4,7]] },
  victory: { bpm: 126, melody: [72,0,76,0,79,0,84,0,83,81,79,0,76,0,79,0, 77,0,81,0,84,0,86,84,83,0,79,0,84,0,0,0], roots: [48,55,53,48], chords: [[0,4,7],[0,4,7],[0,4,7],[0,4,7]] },
  rest: { bpm: 80, melody: [76,0,0,74,72,0,0,0,74,0,0,77,76,0,0,0,72,0,0,71,69,0,0,0,71,0,0,74,72,0,0,0], roots: [48,53,45,55], chords: [[0,4,7],[0,4,7],[0,3,7],[0,4,7]] },
};
// 五聲音階（宮商角徵羽），撥弦音色模擬古箏。
const GUFENG = {
  adventure: { bpm: 96, melody: [72,0,74,76,79,0,76,74,72,0,69,72,74,0,0,0, 76,0,79,81,79,76,74,0,72,74,72,69,67,0,0,0], roots: [48,45,43,48], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
  battle: { bpm: 132, melody: [79,81,79,76,74,76,79,0,81,84,81,79,76,0,74,0, 76,79,76,74,72,74,76,0,79,76,74,72,69,72,74,0], roots: [45,43,41,43], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
  victory: { bpm: 110, melody: [72,76,79,84,0,81,79,0,76,79,81,84,86,0,84,0, 81,84,86,88,0,86,84,81,79,81,84,0,84,0,0,0], roots: [48,43,45,48], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
  rest: { bpm: 72, melody: [69,0,72,0,74,0,72,69,67,0,0,0,69,0,64,0, 67,0,69,72,69,0,67,64,62,0,0,0,64,0,0,0], roots: [45,41,43,45], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
};
// 七和弦與柔和正弦音色，適合專心讀題。
const STUDY = {
  adventure: { bpm: 84, melody: [76,0,0,79,77,0,74,0,72,0,0,74,76,0,0,0, 77,0,0,81,79,0,76,0,74,0,72,0,71,0,0,0], roots: [48,45,50,43], chords: [[0,4,7,11],[0,3,7,10],[0,3,7,10],[0,4,7,10]] },
  battle: { bpm: 108, melody: [72,0,75,77,79,0,77,75,72,0,70,72,75,0,0,0, 74,0,77,79,80,0,79,77,74,0,72,74,77,0,0,0], roots: [45,41,43,40], chords: [[0,3,7,10],[0,4,7,11],[0,4,7,10],[0,3,7,10]] },
  victory: { bpm: 96, melody: [79,0,83,0,86,0,84,83,81,0,79,0,76,0,0,0, 77,0,81,0,84,0,83,81,79,0,0,0,79,0,0,0], roots: [43,48,45,50], chords: [[0,4,7,11],[0,4,7,11],[0,3,7,10],[0,4,7,10]] },
  rest: { bpm: 66, melody: [74,0,0,0,72,0,71,0,69,0,0,0,0,0,0,0, 71,0,0,0,72,0,74,0,76,0,0,0,0,0,0,0], roots: [45,50,43,48], chords: [[0,3,7,10],[0,4,7,10],[0,4,7,11],[0,4,7,11]] },
};
// 鋸齒波主旋律＋強力和弦與鼓點，節奏最快。
const ROCK = {
  adventure: { bpm: 140, melody: [76,76,0,79,0,81,0,79,76,0,74,0,76,0,0,0, 72,72,0,76,0,79,0,81,79,0,76,0,74,0,0,0], roots: [40,48,43,45], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
  battle: { bpm: 168, melody: [76,0,79,76,81,0,79,76,83,81,79,76,79,0,76,74, 72,0,76,72,79,0,76,72,81,79,76,74,76,0,0,0], roots: [40,40,43,38], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
  victory: { bpm: 150, melody: [76,79,84,0,84,0,83,84,86,0,84,0,79,0,0,0, 81,84,88,0,88,0,86,84,83,0,84,0,84,0,0,0], roots: [48,43,45,48], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
  rest: { bpm: 100, melody: [69,0,0,72,0,0,74,0,72,0,69,0,67,0,0,0, 69,0,0,72,0,0,76,0,74,0,72,0,69,0,0,0], roots: [45,41,43,40], chords: [[0,7,12],[0,7,12],[0,7,12],[0,7,12]] },
};
export const MUSIC_PACKS = {
  chip: { label: '8-bit 冒險', note: '原創 8-bit 晶片音樂', titles: { adventure: '輕快出發', battle: '腦力交鋒', victory: '勝利時刻', rest: '再次啟程' }, themes: CHIP,
    voice: { lead: 'square', leadLevel: 0.065, leadLen: 0.78, bass: 'triangle', pad: 'triangle', kick: 'battle' } },
  guofeng: { label: '山海古風', note: '五聲音階，古箏撥弦風', titles: { adventure: '青丘遊', battle: '鳴蛇陣', victory: '鳳鳴', rest: '夜泊' }, themes: GUFENG,
    voice: { lead: 'triangle', leadLevel: 0.12, leadLen: 0.55, shimmer: true, bass: 'sine', pad: 'sine', kick: 'battle' } },
  study: { label: '月夜書齋', note: '柔和慢節奏，適合專心讀題', titles: { adventure: '燈下讀書', battle: '靜心解題', victory: '會心一笑', rest: '月光小憩' }, themes: STUDY,
    voice: { lead: 'sine', leadLevel: 0.09, leadLen: 1.4, bass: 'sine', pad: 'sine', kick: 'none' } },
  rock: { label: '熱血擂台', note: '快節奏電吉他風，鼓點強烈', titles: { adventure: '集合出征', battle: '決戰擂台', victory: '冠軍之歌', rest: '再戰一回' }, themes: ROCK,
    voice: { lead: 'sawtooth', leadLevel: 0.045, leadLen: 0.7, bass: 'square', pad: 'sawtooth', kick: 'always' } },
};
export const PACK_IDS = Object.keys(MUSIC_PACKS);

export class BackgroundMusic {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.3;
    this.theme = 'adventure';
    this.pack = 'chip';
    this.hidden = false;
    this.unlocked = false;
    this.timer = null;
    this.voices = new Set();
    this.step = 0;
    this.nextTime = 0;
  }

  async unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 5;
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.ctx.addEventListener('statechange', () => this.sync());
    }
    try {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      this.unlocked = this.ctx.state === 'running';
      this.sync();
      return this.unlocked;
    } catch {
      return false;
    }
  }

  configure({ enabled = this.enabled, volume = this.volume, theme = this.theme, hidden = this.hidden, pack = this.pack } = {}) {
    const changed = this.theme !== theme || this.pack !== pack;
    this.pack = MUSIC_PACKS[pack] ? pack : 'chip';
    this.enabled = enabled;
    this.volume = Math.min(1, Math.max(0, volume));
    this.theme = MUSIC_PACKS[this.pack].themes[theme] ? theme : 'adventure';
    this.hidden = hidden;
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
    if (changed) this.stop();
    this.sync();
  }

  sync() {
    if (!this.unlocked || !this.enabled || this.hidden || this.ctx?.state !== 'running') {
      this.stop();
      return;
    }
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.045;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 45);
  }

  tone(midi, when, duration, type, level) {
    const osc = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(level, when + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(envelope);
    envelope.connect(this.master);
    this.voices.add(osc);
    osc.onended = () => { this.voices.delete(osc); osc.disconnect(); envelope.disconnect(); };
    osc.start(when);
    osc.stop(when + duration + 0.015);
  }

  schedule() {
    const pack = MUSIC_PACKS[this.pack], voice = pack.voice, track = pack.themes[this.theme];
    const beat = 60 / track.bpm / 2;
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.045;
    while (this.nextTime < this.ctx.currentTime + 0.16) {
      const step = this.step % track.melody.length;
      const bar = Math.floor(step / 8) % track.roots.length;
      const root = track.roots[bar];
      const note = track.melody[step];
      const rest = this.theme === 'rest';
      if (note) {
        this.tone(note, this.nextTime, beat * voice.leadLen, rest && voice.lead === 'square' ? 'triangle' : voice.lead, voice.leadLevel);
        if (voice.shimmer) this.tone(note + 12, this.nextTime, beat * 0.35, 'sine', voice.leadLevel * 0.35);
      }
      if (step % 2 === 0) this.tone(root + (step % 4 === 2 ? 12 : 0), this.nextTime, beat * 1.5, voice.bass, voice.bass === 'square' ? 0.07 : 0.15);
      const chord = track.chords[bar];
      this.tone(root + 12 + chord[step % chord.length], this.nextTime, beat * 0.5, voice.pad, voice.pad === 'sawtooth' ? 0.02 : 0.045);
      const kick = voice.kick === 'always' ? step % 2 === 0 : voice.kick === 'battle' && this.theme === 'battle' && step % 4 === 0;
      if (kick && !rest) this.tone(28, this.nextTime, 0.08, 'sine', 0.22);
      if (voice.kick === 'always' && step % 2 === 1 && !rest) this.tone(96, this.nextTime, 0.025, 'square', 0.012);
      this.step++;
      this.nextTime += beat;
    }
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    for (const osc of this.voices) { try { osc.stop(); } catch {} }
    this.voices.clear();
  }

  dispose() {
    this.stop();
    this.unlocked = false;
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
  }
}
