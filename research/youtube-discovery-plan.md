# Less Than 10 Views — YouTube music video discovery and verification

Status: **research only**. No qualifying music video has been independently verified for inclusion yet.

## Strict qualification criteria

1. Exact public YouTube video URL and video ID, with an independently checked **0–9 public views** at a dated observation time. Counts can rise later; retain the starting observation.
2. The content is a genuine music video or filmed musical performance featuring original music, not a static lyric image, spam upload, playlist, advertisement, or automated reupload.
3. The musician(s) and recording/video are credibly human-created; don't label as AI-free on the basis of a generic biography.
4. Video is publicly viewable and embeddable in the YouTube IFrame player; if embedding is blocked, retain a fallback link and flag for review.
5. Record published date, video/channel title, creator channel URL, provenance and any confirmed location.
6. Deduplicate by exact YouTube video ID, not just channel or title.

## Verification process

Use the official YouTube Data API v3 when an authorised API key/quota is available. Query `search.list` for recent videos with `type=video` and `videoCategoryId=10` where supported, then batch `videos.list(part=snippet,statistics,status,contentDetails)` for exact view counts and `status.embeddable`. API search is a discovery mechanism, not proof that a result has fewer than 10 views. Confirm music-video suitability and human origin separately. The YouTube API may return view counts as strings and not every video exposes public view data.

Record candidate fields in `youtube-candidates.csv`: video_id, title, channel, channel_url, video_url, published_at, views_observed, observed_at_utc, embeddable, music_video_evidence, human_music_evidence, ai_provenance_status, status, notes.

Do not fabricate a zero count for hidden counts, and do not assume an embedded playback is a counted view. Preserve platform-native play controls; don't autoplay or use artificial view generation.

## Prototype

Development branch `youtube-video-pivot` contains an in-site modal using the official YouTube iframe embed domain and a clearly labelled YouTube demonstration clip. Its GitHub Actions build passed. It has **not** been published over the Spotify site.

## Current blocker

Web search alone cannot reliably find and validate 0–9-view videos in volume; the research process needs authorised YouTube Data API access or a browser-based manual validation workflow. No credentials should be committed to the public repository. The API key, if used, belongs in GitHub Actions Secrets with limited scope and quota. Do not make a live-site change until an initial batch of 20 real qualifying videos has passed verification.
