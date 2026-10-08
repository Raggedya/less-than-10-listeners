---
name: Browser audio verification
description: Limits of headless Web Audio verification and how to report iPhone audio testing honestly.
---

The container's headless system Chromium reported a running AudioContext but its real-time audio clock stopped advancing, including in an independent continuous-oscillator check. Do not interpret that as proof of an application sound bug, or treat headless output as physical-device audibility.

**Why:** Real-time tick timestamps initially appeared equally spaced despite visibly slowing panel crossings; the browser audio clock was frozen, not the reel motion.

**How to apply:** Verify gesture-only context creation/resume, event synchronization, mute and persistence in browser tests. Verify nonzero, unclipped tick/stop waveforms with OfflineAudioContext separately. State explicitly that physical iPhone Safari speaker output was not tested. Recheck the clock if the environment changes.
