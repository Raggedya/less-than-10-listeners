# Crowd Surf Publisher

Single-page Windows publishing application for Crowd Surf band editions.

## Features

- Title, MP3 and artwork selection.
- Up to four flexible call-to-action links.
- Editable edition library.
- Publish/unpublish switch.
- Automatic public URL, QR code and 1200×630 social-preview card.
- Artwork-derived lighting palette sent to the game.

The app asks for the private publisher key once and saves it in the current Windows user's AppData folder.

## Build

The GitHub Actions workflow builds `CrowdSurfPublisher.exe` on a Windows runner using PyInstaller.
