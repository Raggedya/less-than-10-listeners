/** The discovery snapshot owns the numeral, never the later/current count. */
export function getStartingCountArtwork(startingListeners: number, basePath: string) {
  if (!Number.isInteger(startingListeners) || startingListeners < 0 || startingListeners > 9) {
    throw new RangeError('Discovery artwork requires a starting listener count from 0 through 9.');
  }
  return `${basePath}artwork/neon-digits/${startingListeners}.webp`;
}
