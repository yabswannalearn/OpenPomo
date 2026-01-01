// Available alarm sounds using Web Audio API
export type AlarmSound = 'beep' | 'chime' | 'bell' | 'digital' | 'gentle' | 'none';

// Extend Window interface for Safari compatibility
interface WindowWithWebkit extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export const ALARM_SOUNDS: { value: AlarmSound; label: string }[] = [
  { value: 'beep', label: 'Beep' },
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'digital', label: 'Digital' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'none', label: 'None' },
];

export function playAlarmSound(sound: AlarmSound) {
  if (sound === 'none') return;
  
  try {
    const w = window as WindowWithWebkit;
    const AudioCtx = w.AudioContext || w.webkitAudioContext;
    if (!AudioCtx) return;
    const audioContext = new AudioCtx();
    
    switch (sound) {
      case 'beep':
        playBeepSound(audioContext);
        break;
      case 'chime':
        playChimeSound(audioContext);
        break;
      case 'bell':
        playBellSound(audioContext);
        break;
      case 'digital':
        playDigitalSound(audioContext);
        break;
      case 'gentle':
        playGentleSound(audioContext);
        break;
    }
    
    setTimeout(() => audioContext.close(), 3000);
  } catch (e) {
    console.log('Audio play failed', e);
  }
}

// Classic beep (original)
function playBeepSound(ctx: AudioContext) {
  const playBeep = (startTime: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, startTime + 0.2);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  };
  const now = ctx.currentTime;
  playBeep(now);
  playBeep(now + 0.4);
  playBeep(now + 0.8);
}

// Musical chime
function playChimeSound(ctx: AudioContext) {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const start = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.8);
    osc.start(start);
    osc.stop(start + 0.8);
  });
}

// Bell sound
function playBellSound(ctx: AudioContext) {
  const playBell = (startTime: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.0);
    osc.start(startTime);
    osc.stop(startTime + 1.0);
  };
  playBell(ctx.currentTime);
  playBell(ctx.currentTime + 1.2);
}

// Digital alarm
function playDigitalSound(ctx: AudioContext) {
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1000;
    osc.type = 'square';
    const start = ctx.currentTime + i * 0.25;
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.setValueAtTime(0, start + 0.1);
    osc.start(start);
    osc.stop(start + 0.15);
  }
}

// Gentle rising tone
function playGentleSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 1.5);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.0);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.5);
}
