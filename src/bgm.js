// 原聲配樂播放器：用 <audio> 播放 public/music 的 MP3，換場景時淡出淡入，
// 回到同一首時從上次的位置繼續。瀏覽器需要使用者先點一下才會開始播放。
export const TRACKS = {
  adventure: { src: '/music/ancient-world-reveal.mp3', title: '遠古世界' },
  camp: { src: '/music/pastime-pleasant.mp3', title: '閒適時光' },
  battle: { src: '/music/final-assault.mp3', title: '最終突擊' },
  boss: { src: '/music/colossal-clash.mp3', title: '巨像對決' },
};

export class TrackPlayer {
  constructor() {
    this.audio = typeof Audio !== 'undefined' ? new Audio() : null;
    if (this.audio) { this.audio.loop = true; this.audio.preload = 'auto'; }
    this.enabled = true; this.volume = 0.3; this.hidden = false; this.unlocked = false;
    this.theme = null; this.positions = {}; this.fadeTimer = null; this.level = 0;
  }
  async unlock() {
    this.unlocked = true;
    return this.sync(true);
  }
  configure({ enabled = this.enabled, volume = this.volume, theme = this.theme, hidden = this.hidden } = {}) {
    this.enabled = enabled; this.volume = Math.min(1, Math.max(0, volume)); this.hidden = hidden;
    if (theme !== this.theme && TRACKS[theme]) { this.switchTo(theme); return; }
    this.sync();
  }
  switchTo(theme) {
    const a = this.audio; if (!a) return;
    if (this.theme && !a.paused) this.positions[this.theme] = a.currentTime;
    const next = () => {
      this.switching = false;
      this.theme = theme;
      a.src = TRACKS[theme].src;
      const at = this.positions[theme] || 0;
      const seek = () => { try { a.currentTime = at; } catch {} };
      if (at) a.addEventListener('loadedmetadata', seek, { once: true });
      this.level = 0; a.volume = 0;
      this.sync();
    };
    if (this.theme && !a.paused) { this.switching = true; this.fade(0, 450, next); } else next();
  }
  fade(target, ms, done) {
    const a = this.audio; clearInterval(this.fadeTimer);
    const start = a.volume, steps = Math.max(1, Math.round(ms / 40)); let i = 0;
    this.fadeTimer = setInterval(() => {
      i++; a.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
      if (i >= steps) { clearInterval(this.fadeTimer); this.fadeTimer = null; done?.(); }
    }, 40);
  }
  async sync(fromGesture = false) {
    const a = this.audio; if (!a || !this.theme || this.switching) return false;
    const shouldPlay = this.unlocked && this.enabled && !this.hidden && this.volume > 0;
    if (!shouldPlay) { if (!a.paused) { this.positions[this.theme] = a.currentTime; a.pause(); } return false; }
    if (a.paused) {
      try { a.volume = 0; await a.play(); } catch { if (fromGesture) this.unlocked = false; return false; }
    }
    this.fade(this.volume, 600);
    return true;
  }
  dispose() { clearInterval(this.fadeTimer); if (this.audio) { this.audio.pause(); this.audio.src = ''; } }
}
