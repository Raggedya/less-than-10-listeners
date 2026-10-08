# Final approved mobile design baseline

The user explicitly approved this visual design. Future work must preserve it unless they request a visual change.

## Reference

- `mobile.jpg`: live mobile preview at 390 × 844, showing the approved design.
- Keep the exact composition, sizing, typography, copy and gold supporting details.
- The Spotify CTA alone uses deep navy (#030d2a–#071541), a thin electric-blue edge/glow, a light-blue Spotify mark (#2f9dff), white label and white external-link icon.
- “LISTENERS” uses a polished warm metallic-gold gradient; “LESS THAN 10” remains bold white.
- Keep the blue/orange neon 3D starting-count artwork, glossy reflections and gold carousel border. Band selection may change the numeral and band-specific data, not the surrounding design.
- Do not change inertia, snapping, mechanical clicks, mute behavior or engagement functionality as a side effect of styling.
- Demo metrics remain honest and clearly disclosed; click-throughs are not actual listens.

## Check before delivering changes

Run `node scripts/verify-approved-design.mjs` to check the approved colors, lettering treatment, CTA height, numeral mapping, responsive overflow and runtime health.

For an intentional color-only change, run the script with `--capture-before` before editing, then with `--compare-before` afterward. It compares positions and sizes of the header, artwork and lower section at 320, 375, 390, 430 and 1440px. The temporary measurements are not a substitute for visually checking the saved reference.

For changes that could affect behavior, also run the existing `verify-neon-artwork.mjs`, `verify-reel.mjs`, `verify-audio-recovery.mjs` and `verify-final-layout.mjs` scripts. The audio checks do not establish physical iPhone speaker audibility.

Keep the saved reference stable. Replace it only after explicit user approval, and review layout changes against it.
