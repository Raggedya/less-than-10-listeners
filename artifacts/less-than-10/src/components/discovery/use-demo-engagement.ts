import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Band } from '@workspace/api-client-react';

interface Activity { clicks: number; loved: boolean; shares: number }
type ActivityMap = Record<string, Activity>;
const KEY = 'lt10-device-demo-activity';
const empty: Activity = { clicks: 0, loved: false, shares: 0 };

function read(): ActivityMap {
  const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: ActivityMap = {};
  for (const [id, entry] of Object.entries(value)) {
    if (!/^\d+$/.test(id) || !entry || typeof entry !== 'object') continue;
    const item = entry as Partial<Activity>;
    if (Number.isSafeInteger(item.clicks) && Number(item.clicks) >= 0 &&
        Number.isSafeInteger(item.shares) && Number(item.shares) >= 0 && typeof item.loved === 'boolean') {
      result[id] = { clicks: item.clicks!, shares: item.shares!, loved: item.loved };
    }
  }
  return result;
}

/** Honest, zero-seeded device-local demo actions, not server/global analytics. */
export function useDemoEngagement(band: Band | undefined) {
  const [activities, setActivities] = useState<ActivityMap>(() => {
    try { return read(); } catch { return {}; }
  });
  const current = useRef(activities);
  const persistent = useRef(true);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [shareBusy, setShareBusy] = useState(false);
  const sharing = useRef(false);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const id = band?.id;

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) {
        try { current.current = read(); setActivities(current.current); }
        catch { persistent.current = false; setStorageAvailable(false); }
      }
    };
    window.addEventListener('storage', sync);
    try { read(); } catch { persistent.current = false; setStorageAvailable(false); }
    return () => window.removeEventListener('storage', sync);
  }, []);

  const update = useCallback((bandId: number, transform: (activity: Activity) => Activity) => {
    let latest = current.current;
    if (persistent.current) {
      try { latest = read(); } catch { persistent.current = false; setStorageAvailable(false); }
    }
    const next = { ...latest, [bandId]: transform(latest[bandId] ?? { ...empty }) };
    current.current = next;
    setActivities(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { persistent.current = false; setStorageAvailable(false); }
  }, []);

  const link = new URL(import.meta.env.BASE_URL, window.location.origin);
  if (id !== undefined) link.searchParams.set('band', String(id));
  const bandLink = link.href;
  link.searchParams.set('via', 'qr');
  const qrLink = link.href;

  const toggleLove = useCallback(() => {
    if (id === undefined) return;
    update(id, activity => ({ ...activity, loved: !activity.loved }));
    setNotice(null);
  }, [id, update]);

  const recordClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    // Count only a real primary/keyboard or middle-button activation, never render/view/hover.
    if (id === undefined || !event.isTrusted || event.defaultPrevented ||
        (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
    update(id, activity => ({ ...activity, clicks: Math.min(Number.MAX_SAFE_INTEGER, activity.clicks + 1) }));
  }, [id, update]);

  const share = useCallback(async () => {
    if (!band || sharing.current) return;
    const selectedBand = band;
    sharing.current = true;
    setShareBusy(true);
    setNotice(null);
    const copied = async () => {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(bandLink);
      update(selectedBand.id, activity => ({ ...activity, shares: Math.min(Number.MAX_SAFE_INTEGER, activity.shares + 1) }));
      setNotice({ id: selectedBand.id, text: 'Link copied. Count includes link copies on this device.' });
    };
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${selectedBand.name} · Less Than 10 Listeners`,
            text: 'Explore this fictional discovery demo.',
            url: bandLink,
          });
          update(selectedBand.id, activity => ({ ...activity, shares: Math.min(Number.MAX_SAFE_INTEGER, activity.shares + 1) }));
          setNotice({ id: selectedBand.id, text: 'Share completed on this device.' });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          await copied();
        }
      } else await copied();
    } catch {
      setNotice({ id: selectedBand.id, text: 'Could not share or copy. Open QR to select the link manually.' });
    } finally {
      sharing.current = false;
      setShareBusy(false);
    }
  }, [band, bandLink, update]);

  return {
    metrics: (id !== undefined ? activities[id] : undefined) ?? empty,
    toggleLove, recordClick, share, shareBusy, storageAvailable, bandLink, qrLink,
    status: notice && notice.id === id ? notice.text : '',
  };
}
