import { useState } from 'react';
import type { Band } from '../components/discovery/demo-band';
import { ExternalLink, Heart, Share2, QrCode } from 'lucide-react';
import { Coverflow } from '../components/discovery/Coverflow';
import { useDemoEngagement } from '../components/discovery/use-demo-engagement';
import { BandQR } from '../components/discovery/BandQR';
import './final-layout.css';

const GOLD = '#c9a85c';

// Static GitHub Pages demo data. These are fictional prototype records.
// Engagement remains device-local; no real Spotify listener or click claims are made.
const bands: Band[] = [
  ['Velvet Static', 'Dream pop', 'After the Rain', 4, 18, 11],
  ['Sunroom Echo', 'Indie folk', 'Slow Morning', 7, 24, 27],
  ['Pale Orbit', 'Alternative', 'Weightless', 2, 12, 43],
  ['The Quiet Current', 'Post-rock', 'Small Hours', 6, 21, 59],
  ['Amber Signals', 'Electronic rock', 'First Light', 9, 32, 75],
].map(([name, genre, trackName, start, current, artSeed], index) => ({
  id: index + 1,
  name: String(name),
  genre: String(genre),
  trackName: String(trackName),
  spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(String(name))}`,
  startingListeners: Number(start),
  startingDate: '2026-09-01',
  currentListeners: Number(current),
  currentDate: '2026-10-07',
  active: true,
  human: true,
  reviewStatus: 'pending',
  reviewNotes: 'Fictional demonstration only. No real-world verification is claimed.',
  demo: true,
  artSeed: Number(artSeed),
  archived: false,
  loved: false,
  metrics: { clicks: 0, uniqueClicks: 0, loves: 0, shares: 0, qrScans: 0, turns: 0, views: 0 },
}));

function SpotifyMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="11" fill="#2f9dff" />
      <path d="M6 9.2c4-1.2 8.3-.8 12 1.1M6.8 12.6c3.3-.9 6.6-.6 9.6.9M7.6 15.8c2.5-.6 5-.4 7.3.7" stroke="#030d2a" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const [sel, setSel] = useState<number | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const initialIndex = Math.max(
    0,
    bands.findIndex((b) => String(b.id) === new URLSearchParams(window.location.search).get('band')),
  );
  const idx = sel ?? initialIndex;
  const band = bands[idx] ?? bands[0];
  const eng = useDemoEngagement(band);
  const { metrics } = eng;

  return (
    <main className="ltf-main" style={{ fontFamily: 'var(--app-font-sans)' }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 30%, rgba(201,168,92,.2), transparent 70%)', animation: 'ltl-sweep 9s ease-in-out infinite' }} />
      <div className="ltf-body">
        <header className="relative z-10" style={{ animation: 'ltl-in .9s both' }}>
          <h1 data-testid="text-title" className="flex flex-col items-center font-bold uppercase leading-[0.88]">
            <span className="text-[clamp(1.9rem,9vw,3.6rem)] tracking-[0.04em] text-white">Less than 10</span>
            <span className="ltl-gold text-[clamp(1.3rem,6vw,2.5rem)] tracking-[0.2em]">Listeners</span>
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[#efe6d2]/60">Please give them a listen. It would mean a lot.</p>
        </header>

        <section className="relative z-10 flex w-full flex-col items-center">
          <Coverflow bands={bands} onSelect={setSel} initialIndex={initialIndex} />
          <div className="ltf-dots" aria-hidden>
            {bands.map((b, i) => (
              <span key={b.id} className="h-1 rounded-full transition-all" style={{ width: i === idx ? 22 : 6, background: i === idx ? GOLD : '#ffffff25' }} />
            ))}
          </div>
          <h2 key={band.id} data-testid="selected-band" aria-live="polite" aria-atomic="true" className="ltf-name" style={{ animation: 'ltl-in .5s both' }}>{band.name}</h2>
          <div data-testid="text-stats" className="ltf-stats">
            <p data-testid="text-starting">Started with <span className="ltf-gold">{band.startingListeners}</span> monthly listeners</p>
            <p data-testid="text-clicks"><span className="ltf-gold">{metrics.clicks}</span> more have now clicked to listen</p>
          </div>
          <a data-testid="link-listen-spotify" href={band.spotifyUrl} target="_blank" rel="noopener noreferrer"
            onClick={eng.recordClick} onAuxClick={eng.recordClick} className="ltf-listen">
            <SpotifyMark /> Listen on Spotify <ExternalLink size={14} />
          </a>
          <div className="ltf-rule" />
          <div className="ltf-ctls">
            <button data-testid="button-love" type="button" className="ltf-ctl" aria-pressed={metrics.loved} aria-label="Love" onClick={eng.toggleLove}>
              <Heart size={18} /> Love <span>{metrics.loved ? 1 : 0}</span>
            </button>
            <button data-testid="button-share" type="button" className="ltf-ctl" aria-label="Share" disabled={eng.shareBusy} onClick={() => { void eng.share(); }}>
              <Share2 size={18} /> Share <span>{metrics.shares}</span>
            </button>
            <button data-testid="button-qr" type="button" className="ltf-ctl" aria-label="Show QR code" onClick={() => setQrOpen(true)}>
              <QrCode size={18} />
            </button>
          </div>
          <div role="status" className="ltf-status">{eng.status}</div>
          <BandQR bandName={band.name} url={eng.qrLink} open={qrOpen} onClose={() => setQrOpen(false)} />
        </section>

        <footer data-testid="text-demo-info" className="ltf-foot relative z-10">
          Fictional demo · Starting counts are samples. Spotify opens a demo search. Activity is device-local.
          <details>
            <summary>How counts work</summary>
            Counts are this device's button actions, not unique people or listens; shares include link copies.
            {!eng.storageAvailable && ' Storage is unavailable, so counts reset on reload.'}
          </details>
        </footer>
      </div>
    </main>
  );
}
