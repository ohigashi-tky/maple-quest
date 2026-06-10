// ============================================================
// WebAudio によるレトロ風 SFX / BGM(外部ファイル不要)
// ============================================================

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let bgmTimer: ReturnType<typeof setInterval> | null = null;
let muted = false;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(ctx.destination);
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.32;
  bgmGain.connect(masterGain);
}

export function setMuted(m: boolean) {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.18,
  delay = 0,
  slide = 0
) {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.2, delay = 0, lowpass = 4000) {
  if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(masterGain);
  src.start(t0);
}

export type SfxName =
  | 'jump' | 'slash' | 'claw' | 'fire' | 'thunder' | 'heal' | 'rush'
  | 'hit' | 'hurt' | 'die' | 'mobdie' | 'bossdie' | 'potion' | 'levelup'
  | 'select' | 'portal' | 'switch' | 'crit' | 'denied';

export function sfx(name: SfxName) {
  if (!ctx || muted) return;
  switch (name) {
    case 'jump': tone(280, 0.12, 'square', 0.12, 0, 220); break;
    case 'slash': noise(0.09, 0.16, 0, 6000); tone(520, 0.06, 'sawtooth', 0.06, 0, -200); break;
    case 'claw': tone(880, 0.08, 'square', 0.08, 0, -300); tone(1180, 0.08, 'square', 0.06, 0.04, -300); break;
    case 'fire': tone(220, 0.25, 'sawtooth', 0.12, 0, -120); noise(0.2, 0.08, 0, 2400); break;
    case 'thunder': noise(0.35, 0.3, 0, 1800); tone(90, 0.3, 'sawtooth', 0.18, 0, -40); break;
    case 'heal': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.07)); break;
    case 'rush': tone(160, 0.22, 'sawtooth', 0.14, 0, 240); noise(0.18, 0.1, 0, 3000); break;
    case 'hit': tone(180, 0.07, 'square', 0.12, 0, -60); noise(0.05, 0.1, 0, 5000); break;
    case 'crit': tone(180, 0.07, 'square', 0.14, 0, -60); tone(720, 0.1, 'square', 0.1, 0.03, 300); break;
    case 'hurt': tone(220, 0.18, 'sawtooth', 0.16, 0, -140); break;
    case 'die': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.16)); break;
    case 'mobdie': tone(420, 0.1, 'square', 0.1, 0, -260); noise(0.1, 0.08, 0.02, 3000); break;
    case 'bossdie':
      [523, 466, 392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'square', 0.12, i * 0.12));
      noise(0.6, 0.18, 0.3, 1500);
      break;
    case 'potion': tone(660, 0.08, 'sine', 0.14); tone(880, 0.1, 'sine', 0.12, 0.07); break;
    case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.1, i * 0.09)); break;
    case 'select': tone(660, 0.07, 'square', 0.1); tone(990, 0.09, 'square', 0.08, 0.05); break;
    case 'portal': [330, 392, 494, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.1, i * 0.06)); break;
    case 'switch': tone(440, 0.07, 'square', 0.1); tone(587, 0.07, 'square', 0.1, 0.06); break;
    case 'denied': tone(180, 0.1, 'square', 0.1); tone(150, 0.12, 'square', 0.1, 0.08); break;
  }
}

// ---------- BGM (簡易ステップシーケンサー / オリジナル曲) ----------
// semitone: A4=440 基準のインデックス。null は休符。
const N = (s: number) => 440 * Math.pow(2, s / 12);
interface Song { bpm: number; lead: (number | null)[]; bass: (number | null)[]; }

const SONGS: Record<string, Song> = {
  title: {
    bpm: 96,
    lead: [0, 4, 7, 12, 7, 4, 0, null, -1, 2, 7, 11, 7, 2, -1, null,
           -3, 0, 4, 9, 4, 0, -3, null, -5, -1, 2, 7, 11, 7, 4, 2],
    bass: [-24, null, -17, null, -25, null, -13, null, -27, null, -15, null, -29, -27, -25, -24,
           -24, null, -17, null, -25, null, -13, null, -27, null, -15, null, -29, -25, -22, -20],
  },
  grass: {
    bpm: 112,
    lead: [7, null, 4, 7, 9, 7, 4, 0, 2, null, 0, 2, 4, 2, 0, -3,
           7, null, 4, 7, 12, 11, 9, 7, 9, 7, 4, 2, 0, null, null, null],
    bass: [-17, -24, -17, -24, -15, -22, -15, -22, -13, -20, -13, -20, -15, -22, -15, -22,
           -17, -24, -17, -24, -15, -22, -15, -22, -13, -20, -13, -20, -12, -19, -12, -19],
  },
  sky: {
    bpm: 100,
    lead: [12, null, 11, 12, 14, null, 12, null, 9, null, 7, 9, 11, null, 9, null,
           7, null, 4, 7, 9, 7, 4, 2, 4, null, 2, 0, -1, null, 0, null],
    bass: [-12, null, -19, null, -14, null, -21, null, -16, null, -23, null, -17, null, -24, null,
           -12, null, -19, null, -14, null, -21, null, -16, -23, -17, -24, -19, null, -12, null],
  },
  dark: {
    bpm: 92,
    lead: [0, null, 0, 3, 2, null, -2, null, 0, null, 0, 3, 5, null, 3, 2,
           0, null, 0, 3, 7, null, 5, 3, 2, 3, 2, 0, -2, null, -4, null],
    bass: [-24, -24, null, -24, -26, -26, null, -26, -24, -24, null, -24, -21, null, -22, null,
           -24, -24, null, -24, -26, -26, null, -26, -19, -19, null, -19, -22, -23, -24, null],
  },
  boss: {
    bpm: 132,
    lead: [0, 0, 3, 0, 5, 0, 3, 0, -2, -2, 2, -2, 3, -2, 2, -2,
           0, 0, 3, 0, 7, 0, 5, 3, 8, 7, 5, 3, 2, 3, 2, -2],
    bass: [-24, -12, -24, -12, -24, -12, -24, -12, -26, -14, -26, -14, -26, -14, -26, -14,
           -24, -12, -24, -12, -24, -12, -24, -12, -19, -19, -21, -21, -22, -22, -23, -23],
  },
};

let currentSong: string | null = null;

export function playBgm(name: keyof typeof SONGS | null) {
  if (!ctx || !bgmGain) return;
  if (currentSong === name) return;
  stopBgm();
  if (!name) return;
  currentSong = name as string;
  const song = SONGS[name];
  const stepDur = 60 / song.bpm / 2; // 8分音符
  let step = 0;
  const playStep = () => {
    if (!ctx || !bgmGain || muted) {
      step = (step + 1) % song.lead.length;
      return;
    }
    const t0 = ctx.currentTime;
    const lead = song.lead[step % song.lead.length];
    const bass = song.bass[step % song.bass.length];
    if (lead !== null) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = N(lead);
      g.gain.setValueAtTime(0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + stepDur * 0.95);
      osc.connect(g).connect(bgmGain);
      osc.start(t0);
      osc.stop(t0 + stepDur);
    }
    if (bass !== null) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = N(bass);
      g.gain.setValueAtTime(0.22, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + stepDur * 0.9);
      osc.connect(g).connect(bgmGain);
      osc.start(t0);
      osc.stop(t0 + stepDur);
    }
    step = (step + 1) % song.lead.length;
  };
  playStep();
  bgmTimer = setInterval(playStep, stepDur * 1000);
}

export function stopBgm() {
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
  currentSong = null;
}
