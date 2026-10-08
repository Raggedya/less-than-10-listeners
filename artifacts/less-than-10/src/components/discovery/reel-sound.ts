/** Small synthesized physical sounds; no downloads, music, or continuous audio loop. */
export function createReelSound(context: BaseAudioContext, output: AudioNode) {
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.045), context.sampleRate);
  const samples = noise.getChannelData(0);
  let seed = 4817;
  for (let i = 0; i < samples.length; i++) {
    seed = (seed * 16807) % 2147483647;
    samples[i] = (seed / 2147483647) * 2 - 1;
  }

  function tone(at: number, frequency: number, gain: number, length: number, endFrequency = frequency) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + length);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(gain, at + 0.0015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(at);
    oscillator.stop(at + length + 0.005);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  function transient(at: number, gain: number, length: number, frequency: number) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.65;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(gain, at + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    source.start(at);
    source.stop(at + length + 0.003);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }

  return {
    tick(at = context.currentTime) {
      transient(at, 0.7, 0.018, 2400);
      tone(at, 1500, 0.24, 0.027, 1050);
      tone(at, 430, 0.15, 0.023, 340);
    },
    stop(at = context.currentTime) {
      transient(at, 0.8, 0.032, 1250);
      tone(at, 240, 0.52, 0.1, 105);
      tone(at, 880, 0.18, 0.08, 740);
      transient(at + 0.04, 0.3, 0.022, 1800);
    },
  };
}
