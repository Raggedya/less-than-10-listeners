import type { Band } from "@workspace/api-zod";

// Fictional prototype records. These figures are illustrative, not Spotify facts.
// No fabricated clicks, visits or engagement events are seeded.
const examples = [
  { name: "Velvet Static", genre: "Dream pop", trackName: "After the Rain", start: 4, current: 18, artSeed: 11 },
  { name: "Sunroom Echo", genre: "Indie folk", trackName: "Slow Morning", start: 7, current: 24, artSeed: 27 },
  { name: "Pale Orbit", genre: "Alternative", trackName: "Weightless", start: 2, current: 12, artSeed: 43 },
  { name: "The Quiet Current", genre: "Post-rock", trackName: "Small Hours", start: 6, current: 21, artSeed: 59 },
  { name: "Amber Signals", genre: "Electronic rock", trackName: "First Light", start: 9, current: 32, artSeed: 75 },
];

export const demoBands: Band[] = examples.map((example, index) => ({
  id: index + 1,
  name: example.name,
  genre: example.genre,
  trackName: example.trackName,
  spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(example.name)}`,
  startingListeners: example.start,
  startingDate: "2026-09-01",
  currentListeners: example.current,
  currentDate: "2026-10-07",
  active: true,
  human: true,
  reviewStatus: "pending",
  reviewNotes: "Fictional demonstration only. No real-world band, activity, human eligibility or listener-count verification is claimed.",
  demo: true,
  artSeed: example.artSeed,
  archived: false,
  loved: false,
  metrics: { clicks: 0, uniqueClicks: 0, loves: 0, shares: 0, qrScans: 0, turns: 0, views: 0 },
}));
