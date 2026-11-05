// Sounds are synthesised so the app ships no audio files and volume stays gentle.

let ctx: AudioContext | null = null;
const audio = () => (ctx ??= new AudioContext());

export function playChime() {
  const ac = audio();
  const now = ac.currentTime;
  [660, 990].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.6);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 1.7);
  });
}

/** Soft, slowly swelling chord. Returns a stop function. */
export function startCalmMusic(): () => void {
  const ac = audio();
  const master = ac.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.08, ac.currentTime + 3);
  master.connect(ac.destination);

  const nodes = [196, 246.94, 293.66, 392].map((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const voice = ac.createGain();
    voice.gain.value = 0.25;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.03;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.2;
    lfo.connect(lfoGain).connect(voice.gain);
    osc.connect(voice).connect(master);
    osc.start();
    lfo.start();
    return [osc, lfo];
  });

  return () => {
    const end = ac.currentTime + 1.5;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0, end);
    nodes.flat().forEach((n) => n.stop(end + 0.1));
  };
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}
