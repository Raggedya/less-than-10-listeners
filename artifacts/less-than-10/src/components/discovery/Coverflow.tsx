import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Band } from './demo-band';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { advanceReel, centreCrossings, createReel, releaseReel, snapTo } from './reel-physics';
import { useReelAudio } from './use-reel-audio';
import { getStartingCountArtwork } from './listener-artwork';
import './coverflow.css';

const mod = (value: number, n: number) => ((value % n) + n) % n;
interface Drag {
  pointer: number; startX: number; startY: number; x: number; y: number;
  time: number; lastMove: number; speed: number; axis: 'pending' | 'horizontal' | 'vertical';
  samples: { position: number; time: number }[];
}

export function Coverflow({ bands, onSelect, initialIndex = 0 }: { bands: Band[]; onSelect: (i: number) => void; initialIndex?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const reel = useRef({ ...createReel(), position: initialIndex, target: initialIndex });
  const drag = useRef<Drag | null>(null);
  const raf = useRef(0);
  const lastFrame = useRef(0);
  const suppressClick = useRef(false);
  const reduced = useRef(false);
  const selected = useRef(initialIndex);
  const [width, setWidth] = useState(358);
  const [position, setPosition] = useState(initialIndex);
  const [phase, setPhase] = useState('idle');
  const [stopId, setStopId] = useState(0);
  const audio = useReelAudio();
  const latest = useRef({ onSelect, audio });
  latest.current = { onSelect, audio };
  const card = Math.min(width * 0.84, 500);
  const spacing = card * 0.72;
  const spacingRef = useRef(spacing);
  spacingRef.current = spacing;

  const paint = useCallback((from: number, final = false) => {
    const state = reel.current;
    // The final detent has its own sound rather than two overlapping ticks.
    if (!final) latest.current.audio.tick(centreCrossings(from, state.position));
    setPosition(state.position);
    setPhase(state.phase);
    const index = mod(Math.round(state.position), bands.length);
    if (selected.current !== index) {
      selected.current = index;
      latest.current.onSelect(index);
    }
    if (final) {
      latest.current.audio.stop();
      setStopId(id => id + 1);
    }
  }, [bands.length]);

  const frame = useCallback((time: number) => {
    raf.current = 0;
    const state = reel.current;
    const before = state.position;
    const dt = lastFrame.current ? (time - lastFrame.current) / 1000 : 1 / 60;
    lastFrame.current = time;
    const finished = advanceReel(state, dt);
    paint(before, finished);
    if (state.phase !== 'idle' && state.phase !== 'dragging') {
      raf.current = requestAnimationFrame(frame);
    }
  }, [paint]);

  const run = useCallback(() => {
    if (!raf.current && reel.current.phase !== 'idle') {
      lastFrame.current = 0;
      raf.current = requestAnimationFrame(frame);
    }
  }, [frame]);

  const halt = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    lastFrame.current = 0;
  }, []);

  const go = useCallback((direction: number) => {
    void latest.current.audio.unlock();
    halt();
    const state = reel.current;
    const before = state.position;
    const base = state.phase === 'snapping' ? state.target : Math.round(state.position);
    snapTo(state, base + direction, reduced.current);
    paint(before, state.phase === 'idle');
    run();
  }, [halt, paint, run]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = media.matches;
    const change = () => {
      reduced.current = media.matches;
      if (media.matches && !drag.current && reel.current.phase !== 'idle') {
        halt();
        const before = reel.current.position;
        snapTo(reel.current, Math.round(before), true);
        paint(before, true);
      }
    };
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    if (root.current) observer.observe(root.current);
    const hide = () => {
      if (document.hidden) {
        halt();
        drag.current = null;
        const state = reel.current;
        snapTo(state, Math.round(state.position), true);
        setPosition(state.position);
        setPhase('idle');
        const index = mod(state.position, bands.length);
        selected.current = index;
        latest.current.onSelect(index);
      }
    };
    media.addEventListener('change', change);
    document.addEventListener('visibilitychange', hide);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', hide);
      halt();
    };
  }, [bands.length, halt, paint]);

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // Mouse down is activating; touch must wait for a real pointerup/touchend.
    if (event.isTrusted && event.pointerType === 'mouse') void latest.current.audio.unlock();
    halt();
    const time = performance.now();
    suppressClick.current = false;
    const p = reel.current.position;
    reel.current.phase = 'dragging';
    reel.current.velocity = 0;
    setPhase('dragging');
    drag.current = {
      pointer: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, time, lastMove: time, speed: 0, axis: 'pending',
      samples: [{ position: p, time }],
    };
    // Capture on the reel; taps are handled explicitly on pointerup (not synthetic click).
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    const time = performance.now();
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (d.axis === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) >= 6) {
      d.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'horizontal' : 'vertical';
    }
    if (d.axis === 'horizontal') {
      const state = reel.current;
      const before = state.position;
      // One panel under the finger per spacing, no drag smoothing or artificial resistance.
      state.position -= (event.clientX - d.x) / spacingRef.current;
      d.samples.push({ position: state.position, time });
      d.samples = d.samples.filter(sample => time - sample.time < 100);
      const first = d.samples[0];
      if (first && time > first.time + 5) {
        d.speed = (state.position - first.position) / ((time - first.time) / 1000);
      }
      d.lastMove = time;
      suppressClick.current = true;
      paint(before);
    }
    d.x = event.clientX;
    d.y = event.clientY;
    d.time = time;
  }

  function up(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const d = drag.current;
    if (!d || event.pointerId !== d.pointer) {
      if (!cancelled && event.isTrusted) void latest.current.audio.unlock();
      return;
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const state = reel.current;
    const before = state.position;
    if (!cancelled && d.axis === 'pending') {
      // A true stationary tap may select a neighbour. A drag never fires this path.
      const bounds = event.currentTarget.getBoundingClientRect();
      const distance = event.clientX - (bounds.left + bounds.width / 2);
      snapTo(state, Math.round(state.position) + (Math.abs(distance) > card * 0.5 ? Math.sign(distance) : 0), reduced.current);
    } else {
      const fresh = performance.now() - d.lastMove < 100;
      releaseReel(state, !cancelled && d.axis === 'horizontal' && fresh ? d.speed : 0, reduced.current);
    }
    // First-use audio setup can be expensive. Capture/release motion first, then
    // unlock within this same real gesture so it cannot age the flick samples.
    if (!cancelled && event.isTrusted) void latest.current.audio.unlock();
    paint(before, state.phase === 'idle' && Math.abs(before - state.position) > 0.01);
    run();
  }

  return (
    <div className="lt-reel-shell">
      <div
        ref={root} data-testid="coverflow" data-position={position.toFixed(4)} data-phase={phase}
        className="lt-reel" style={{ height: card + 64, perspective: 1000 }}
        role="group" aria-roledescription="carousel" aria-label="Five fictional demo bands. Swipe or use left and right arrow keys."
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault(); go(event.key === 'ArrowRight' ? 1 : -1);
          }
        }}
        onPointerDown={down} onPointerMove={move}
        onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)}
        onTouchEnd={event => { if (event.isTrusted) void latest.current.audio.unlock(); }}
        onClick={event => { if (suppressClick.current) event.preventDefault(); }}
      >
        {bands.map((band, index) => {
          const distance = mod(index - position + bands.length / 2, bands.length) - bands.length / 2;
          const abs = Math.abs(distance);
          const isSelected = mod(Math.round(position), bands.length) === index;
          return (
            <div key={band.id} data-testid={`card-band-${band.id}`} aria-hidden={!isSelected}
              className={`lt-art-panel${isSelected ? ' is-selected' : ''}`}
              style={{
                width: card, height: card, marginLeft: -card / 2,
                transform: `translate3d(${distance * spacing * 1.06}px,0,${-abs * 185}px) rotateY(${Math.max(-1, Math.min(1, distance)) * -52}deg)`,
                zIndex: 10 - Math.round(abs * 3), opacity: Math.max(0.12, 1 - abs * 0.28),
              }}>
              <img src={getStartingCountArtwork(band.startingListeners, import.meta.env.BASE_URL)}
                className="lt-art-image" alt={`${band.startingListeners} monthly listeners when discovered, sculptural neon-glass numeral`}
                draggable={false} decoding="async" loading="eager"
                style={{ opacity: 1 - Math.min(abs, 1.5) * 0.19 }} />
              <div className="lt-panel-glass" />
              <div className="lt-listener-caption">MONTHLY LISTENERS WHEN DISCOVERED</div>
              <div className="lt-panel-frame" />
              {isSelected && phase === 'idle' && <div key={stopId} className="lt-detent-flash" />}
            </div>
          );
        })}
        <button type="button" aria-label="Previous band" data-testid="button-prev" className="lt-reel-arrow lt-reel-prev"
          onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}
          onClick={() => go(-1)}><ChevronLeft size={20} /></button>
        <button type="button" aria-label="Next band" data-testid="button-next" className="lt-reel-arrow lt-reel-next"
          onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}
          onClick={() => go(1)}><ChevronRight size={20} /></button>
      </div>
      <div className="lt-reel-controls">
        <span className="lt-reel-instruction" aria-hidden="true">DRAG SLOWLY · FLICK TO SPIN</span>
        <button type="button" data-testid="button-sound" data-audio-state={audio.status} data-muted={audio.muted}
          className="lt-sound-toggle" onClick={audio.toggle} aria-pressed={!audio.muted && audio.status === 'running'}
          aria-label={audio.muted ? 'Unmute mechanical reel sounds' : audio.status === 'running' ? 'Mute mechanical reel sounds' : 'Enable or resume mechanical reel sounds'}
          title={audio.muted ? 'Unmute reel sounds' : audio.status === 'running' ? 'Mute reel sounds' : 'Tap to enable or resume reel sounds'}>
          {audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span aria-live="polite">{audio.muted ? 'MUTED' : audio.status === 'running' ? 'SOUND ON' : audio.status === 'locked' ? 'ENABLE SOUND' : audio.status === 'unavailable' ? 'UNAVAILABLE' : 'RESUME SOUND'}</span>
        </button>
      </div>
    </div>
  );
}
