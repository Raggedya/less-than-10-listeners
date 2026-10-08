/** Positions are measured in panels, speeds in panels/second, times in seconds. */
export type ReelPhase = 'idle' | 'dragging' | 'coasting' | 'snapping';
export interface ReelState {
  position: number;
  velocity: number;
  phase: ReelPhase;
  target: number;
  snapFrom: number;
  elapsed: number;
  duration: number;
}

export const MAX_FLICK_SPEED = 11;
const COAST_DECAY = 0.9;
const SNAP_SPEED = 0.38;

export function createReel(): ReelState {
  return { position: 0, velocity: 0, phase: 'idle', target: 0, snapFrom: 0, elapsed: 0, duration: 0.38 };
}

export function snapTo(state: ReelState, target: number, reduced = false): void {
  state.target = target;
  state.snapFrom = state.position;
  state.elapsed = 0;
  state.duration = Math.abs(target - state.position) > 1 ? 0.48 : 0.36;
  state.velocity = 0;
  state.phase = reduced || Math.abs(target - state.position) < 0.0001 ? 'idle' : 'snapping';
  if (state.phase === 'idle') state.position = target;
}

export function releaseReel(state: ReelState, speed: number, reduced = false): void {
  state.velocity = Math.max(-MAX_FLICK_SPEED, Math.min(MAX_FLICK_SPEED, speed));
  if (reduced || Math.abs(speed) < 1.1) {
    snapTo(state, Math.round(state.position), reduced);
  } else {
    state.phase = 'coasting';
  }
}

/** Frame-rate independent exponential coast, followed by a short exact detent snap. */
export function advanceReel(state: ReelState, seconds: number): boolean {
  if (state.phase === 'idle' || state.phase === 'dragging') return false;
  const dt = Math.max(0, Math.min(seconds, 0.05));
  if (state.phase === 'coasting') {
    const decay = Math.exp(-COAST_DECAY * dt);
    state.position += (state.velocity * (1 - decay)) / COAST_DECAY;
    state.velocity *= decay;
    if (Math.abs(state.velocity) < SNAP_SPEED) {
      snapTo(state, Math.round(state.position + state.velocity * 0.18));
    }
  } else {
    state.elapsed += dt;
    const t = Math.min(1, state.elapsed / state.duration);
    const eased = 1 - Math.pow(1 - t, 4);
    state.position = state.snapFrom + (state.target - state.snapFrom) * eased;
    if (t === 1) {
      state.position = state.target;
      state.phase = 'idle';
      return true;
    }
  }
  return false;
}

/** An integer position means a panel actually crossed the centre, not a timer tick. */
export function centreCrossings(from: number, to: number): number {
  if (to > from) return Math.max(0, Math.floor(to + 1e-8) - Math.floor(from + 1e-8));
  if (to < from) return Math.max(0, Math.ceil(from - 1e-8) - Math.ceil(to - 1e-8));
  return 0;
}
