# Less Than 10 Listeners — approved source backup

This archive preserves the final approved mobile prototype: neon blue/orange
starting-count numerals, polished gold LISTENERS heading, navy/blue Spotify CTA,
carousel inertia and mechanical clicks, and the existing engagement controls.
It is a source backup, not a published website or a newly created GitHub repository.

## What is included

- All frontend, Express backend, mockup sandbox and shared library source.
- Original generated numeral PNGs, optimized WebP digits, earlier artwork, favicon
  and the saved approved mobile screenshot.
- pnpm lockfile, workspace/package/TypeScript/Vite/API configuration and tests.
- Original .replit and artifact routing manifests, copied without changes.
- backup/git-history.bundle containing the existing Git refs and history.
- backup/manifest.json with per-file SHA-256 values and the original approved HEAD.
- backup/secret-scan-report.json describing the checks and their limitations.
- backup-tools/local-vite.config.mts, an OPTIONAL local-preview configuration.

## What is intentionally excluded

No .env files, injected Replit secrets, authentication tokens, local Git config,
credential helpers, private profile, dependencies, caches, logs or build outputs.
The local .git directory is not copied: history is preserved in the Git bundle,
without carrying workspace remote URLs, credential configuration or hooks.
The .local workspace runtime/skills/tasks are not application source.
No database dump, Replit account settings or browser localStorage is included.
Love/share/click counts are device-local and are not preserved by a source backup.

## Download and extract on desktop

Download the ZIP, then use Windows “Extract All…” or double-click it on macOS.
Open the resulting less-than-10-listeners directory in your editor.
Keep the ZIP somewhere safe. It contains project source and history.

## Restore in a fresh Replit project

1. Create/open a fresh project and upload/extract the archive there. Do not
   overwrite your working project. The package.json, artifacts and lib folders
   should be directly under the new project's root.
2. Use Node.js 24 and pnpm 10 (the workspace's pnpm version is recorded in the
   scan report). Run `pnpm install --frozen-lockfile`.
3. The saved artifact manifests describe frontend and API services and routes.
   Confirm both services are registered/running and that `/api` routes to the API.
   In Replit, each service must receive its managed PORT and frontend BASE_PATH.
4. Preview only. Importing the archive must not be treated as permission to publish.

No secret is required by the current demo API routes. Secret names may occur in
unused scaffolding, but their values are not backed up. If database/auth features
are added later, provision new credentials securely rather than reusing embedded
values. `lib/db` requires DATABASE_URL only when that module is used.

## Restore and run on a desktop

Install Node.js 24 and pnpm 10. From this directory:

    pnpm install --frozen-lockfile

The frontend fetches `/api`, so plain static hosting or Vite without an API proxy
is not a complete working restore. The optional config supplies a LOCAL-only proxy
to the backend without changing the approved app's Vite configuration.

macOS/Linux terminal 1:

    PORT=5000 pnpm --filter @workspace/api-server run dev

macOS/Linux terminal 2:

    PORT=5173 BASE_PATH=/ pnpm --filter @workspace/less-than-10 exec vite --config ../../backup-tools/local-vite.config.mts

Windows PowerShell terminal 1:

    $env:PORT='5000'
    pnpm --filter @workspace/api-server run dev

Windows PowerShell terminal 2:

    $env:PORT='5173'
    $env:BASE_PATH='/'
    pnpm --filter @workspace/less-than-10 exec vite --config ../../backup-tools/local-vite.config.mts

Open http://localhost:5173. Both terminals must remain running.

## Optional: recover the original Git history

The extracted source works without Git. To recover the history, run this from the
EXTRACTED directory and create a NEW sibling directory:

    git clone backup/git-history.bundle ../less-than-10-listeners-with-history

That clone preserves the original approved commit. It does not restore Replit's
existing remotes or credentials; those are deliberately not exported. The extra
README, manifest and backup-tools folder are archive additions, not old commits.
Copy backup-tools into that clone if you want the optional desktop preview.
Do not run reset/checkout commands in the original working Replit project.

## Verification

`backup/manifest.json` lists SHA-256 hashes for every included payload except the
manifest itself. On Python-equipped desktops, check them from the extracted root:

    python3 backup-tools/verify-backup.py

For the complete ZIP SHA-256, see the adjacent .sha256 file in the original
workspace or the delivery message. Git history can be checked with:

    git bundle verify backup/git-history.bundle

That command needs an initialized Git repository; cloning the bundle is another
integrity test. Run `pnpm --filter @workspace/less-than-10 run typecheck` after
installing dependencies. Existing browser tests require Chromium/Playwright and
their expected preview URL; they do not prove physical iPhone speaker audibility.

## Scope and security

Five bands and starting/current counts are clearly fictional demo samples.
Spotify opens demo searches; clicks are not actual listens. Shared analytics,
server-wide fair rotation, live band verification and secure administration remain
future work, not capabilities implied by this archive.

Secret scanners found no detected secrets, but automated checks cannot prove the
absence of every possible credential. The scan did not read Replit secret values.
Do not put this archive on a public website or commit it to a public repository.
Any future GitHub backup should remain PRIVATE as requested.
