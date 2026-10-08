import { useCallback, useEffect, useRef, useState } from 'react';
import { createReelSound } from './reel-sound';

type AudioStatus = 'locked' | 'running' | 'suspended' | 'unavailable';
const MUTE_KEY = 'lt10-reel-muted';

export function useReelAudio() {
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === 'true'; } catch { return false; }
  });
  const [status, setStatus] = useState<AudioStatus>('locked');
  const mutedRef = useRef(muted);
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const sound = useRef<ReturnType<typeof createReelSound> | null>(null);
  const queuedAt = useRef(0);

  // Call directly inside a trusted input handler, never from an effect or timer.
  // Touch pointerup/touchend retry even if Safari refused the earlier pointerdown.
  const unlock = useCallback(() => {
    try {
      if (document.hidden || mutedRef.current) return Promise.resolve(false);
      if (!context.current || context.current.state === 'closed') {
        const Audio = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Audio) { setStatus('unavailable'); return Promise.resolve(false); }
        const ctx = new Audio();
        const gain = ctx.createGain();
        gain.gain.value = 0.42;
        gain.connect(ctx.destination);
        // Context clocks restart at zero. Never retain an old clock's detent queue.
        queuedAt.current = 0;
        context.current = ctx;
        master.current = gain;
        sound.current = createReelSound(ctx, gain);
        ctx.onstatechange = () => {
          if (context.current !== ctx) return;
          if (ctx.state !== 'running') queuedAt.current = 0;
          setStatus(ctx.state === 'running' ? 'running' : 'suspended');
        };
      }
      const ctx = context.current;
      if (ctx.state !== 'running') {
        // Do not coalesce pending resume attempts: a touch-end gesture may be the
        // first permitted attempt even while pointerdown's promise is still pending.
        return ctx.resume().then(() => {
          if (context.current !== ctx) return false;
          if (document.hidden) {
            void ctx.suspend().catch(() => {});
            setStatus('suspended');
            return false;
          }
          queuedAt.current = 0;
          setStatus(ctx.state === 'running' ? 'running' : 'suspended');
          return ctx.state === 'running';
        }).catch(() => {
          if (context.current === ctx) setStatus('suspended');
          return false;
        });
      }
      setStatus('running');
      return Promise.resolve(true);
    } catch {
      setStatus('unavailable');
      return Promise.resolve(false);
    }
  }, []);

  const tick = useCallback((crossings = 1) => {
    const ctx = context.current;
    if (mutedRef.current || !ctx || ctx.state !== 'running' || !sound.current) return;
    const now = ctx.currentTime;
    // Bound lead time even after interruptions or a stale development refresh.
    if (queuedAt.current < now || queuedAt.current > now + 0.06) queuedAt.current = now;
    // Only a few milliseconds of scheduling lead, never a backlog after mute/backgrounding.
    for (let i = 0; i < Math.min(crossings, 4); i++) {
      const at = Math.max(now + 0.003, queuedAt.current + 0.012);
      sound.current.tick(at);
      queuedAt.current = at;
    }
  }, []);

  const stop = useCallback(() => {
    const ctx = context.current;
    if (mutedRef.current || !ctx || ctx.state !== 'running' || !sound.current) return;
    if (queuedAt.current < ctx.currentTime || queuedAt.current > ctx.currentTime + 0.06) queuedAt.current = ctx.currentTime;
    sound.current.stop(Math.max(ctx.currentTime + 0.003, queuedAt.current + 0.01));
  }, []);

  const toggle = useCallback(() => {
    // An enabled-but-blocked control means "resume", not "silently mute".
    const next = !mutedRef.current && context.current?.state === 'running';
    mutedRef.current = next;
    setMuted(next);
    try { localStorage.setItem(MUTE_KEY, String(next)); } catch { /* Preference works for this session. */ }
    queuedAt.current = 0;
    const ctx = context.current;
    if (ctx && master.current) {
      master.current.gain.cancelScheduledValues(ctx.currentTime);
      master.current.gain.setTargetAtTime(next ? 0 : 0.42, ctx.currentTime, 0.008);
    }
    if (!next) {
      // One confirmation only after explicitly enabling/resuming sound, not every
      // swipe or foreground event. The waveform and normal reel cadence stay intact.
      void unlock().then(running => { if (running && !mutedRef.current) tick(); });
    }
  }, [unlock, tick]);

  useEffect(() => {
    const pause = () => {
      queuedAt.current = 0;
      const ctx = context.current;
      if (ctx) {
        setStatus('suspended');
        if (ctx.state === 'running') void ctx.suspend().catch(() => {});
      }
    };
    const inspect = () => {
      const ctx = context.current;
      setStatus(!ctx ? 'locked' : ctx.state === 'running' ? 'running' : 'suspended');
      // Coming back from Spotify/BFCache never starts audio automatically.
      // Show the resume control; the next real touch/key/button gesture unlocks.
    };
    const visibility = () => { if (document.hidden) pause(); else inspect(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', inspect);
    window.addEventListener('focus', inspect);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', inspect);
      window.removeEventListener('focus', inspect);
      const ctx = context.current;
      if (ctx) { ctx.onstatechange = null; void ctx.close().catch(() => {}); }
      context.current = null;
      master.current = null;
      sound.current = null;
      queuedAt.current = 0;
    };
  }, []);

  return { muted, status, unlock, tick, stop, toggle };
}
