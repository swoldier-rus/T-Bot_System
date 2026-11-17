/**
 * Sound Service for MOEX Screener Pro Desktop
 * Supports custom audio files (mp3, wav, ogg, etc.) and a polyphonic Web Audio synthesizer fallback.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synthesizes a soft, pleasant polyphonic chime using Web Audio API oscillators.
 * @param {'BUY'|'SELL'} direction
 * @param {number} volume - 0 to 100
 */
export function playSynthChime(direction = 'BUY', volume = 80) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const masterVol = Math.max(0, Math.min(1, (Number(volume) || 80) / 100));
    if (masterVol <= 0) return;

    const now = ctx.currentTime;
    const isBuy = direction === 'BUY';

    // Frequencies:
    // BUY:  Ascending C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz)
    // SELL: Descending G5 (783.99 Hz) -> E5 (659.25 Hz) -> C5 (523.25 Hz)
    const notes = isBuy
      ? [
          { freq: 523.25, time: 0.00, dur: 0.25 },
          { freq: 659.25, time: 0.07, dur: 0.30 },
          { freq: 783.99, time: 0.14, dur: 0.45 },
        ]
      : [
          { freq: 783.99, time: 0.00, dur: 0.25 },
          { freq: 659.25, time: 0.07, dur: 0.30 },
          { freq: 523.25, time: 0.14, dur: 0.45 },
        ];

    notes.forEach(({ freq, time, dur }) => {
      const startTime = now + time;
      const stopTime = startTime + dur;

      // Primary sine oscillator for smooth body
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Subtle harmonic overtone (triangle) for richness
      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(freq * (isBuy ? 2 : 1), startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.35 * masterVol, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.0001, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.08 * masterVol, startTime + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      subOsc.connect(subGain);
      gain.connect(ctx.destination);
      subGain.connect(ctx.destination);

      osc.start(startTime);
      subOsc.start(startTime);
      osc.stop(stopTime + 0.05);
      subOsc.stop(stopTime + 0.05);
    });
  } catch (err) {
    console.error('Failed to play synth chime', err);
  }
}

/**
 * Plays an audio file from a local path or URL.
 * Falls back to synth chime if playback fails.
 * @param {string} filePath
 * @param {'BUY'|'SELL'} direction
 * @param {number} volume - 0 to 100
 */
export function playCustomAudio(filePath, direction = 'BUY', volume = 80) {
  if (!filePath || !filePath.trim()) {
    playSynthChime(direction, volume);
    return;
  }

  try {
    const rawPath = filePath.trim();
    let src = rawPath;
    if (!rawPath.startsWith('http://') && !rawPath.startsWith('https://') && !rawPath.startsWith('file://')) {
      // Normalize Windows backslashes and create file protocol URI
      src = 'file:///' + rawPath.replace(/\\/g, '/');
    }

    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, (Number(volume) || 80) / 100));

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Custom sound failed to play, falling back to synth', err);
        playSynthChime(direction, volume);
      });
    }
  } catch (err) {
    console.warn('Error creating audio for custom sound, falling back to synth', err);
    playSynthChime(direction, volume);
  }
}

/**
 * Universal alert sound trigger.
 * @param {Object} options
 * @param {'BUY'|'SELL'} options.direction
 * @param {string} [options.customPath]
 * @param {number} [options.volume] - 0 to 100
 */
export function playAlertSound({ direction = 'BUY', customPath = '', volume = 80 } = {}) {
  if (customPath && customPath.trim().length > 0) {
    playCustomAudio(customPath, direction, volume);
  } else {
    playSynthChime(direction, volume);
  }
}
