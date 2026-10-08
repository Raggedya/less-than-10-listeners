/** Static demo-only band shape. No server or Spotify API is required. */
export interface Band {
  id: number;
  name: string;
  genre: string;
  trackName: string;
  spotifyUrl: string;
  startingListeners: number;
  startingDate: string;
  currentListeners: number;
  currentDate: string;
  active: boolean;
  human: boolean;
  reviewStatus: string;
  reviewNotes: string;
  demo: boolean;
  artSeed: number;
  archived: boolean;
  loved: boolean;
  metrics: { clicks: number; uniqueClicks: number; loves: number; shares: number; qrScans: number; turns: number; views: number };
}
