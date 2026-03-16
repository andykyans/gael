# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gaele Advisor (Andy) — a static landing page for energy consulting lead generation in Belgium. Built with vanilla HTML, CSS, and JavaScript (no frameworks, no build system, no package manager).

## Running Locally

```bash
# Any static HTTP server works. Examples:
python3 -m http.server 8000
# or
npx serve .
```

No install step or build step is required. Open `http://localhost:8000` in a browser.

## Architecture

This is a single-page site with three files:

- **index.html** — Full page structure with all content sections (hero, qualification quiz, service offers, FAQ, testimonials, booking modal). All content is in French.
- **script.js** — Interactive logic: qualification quiz (`selectQ`/`showQualResult`), appointment modal (`openCal`/`closeCal`/`submitCal`), FAQ accordion (`toggleFaq`), and Flatpickr calendar initialization.
- **styles.css** — Design system using CSS custom properties, responsive breakpoints at 1024/900/768/600/500px, clamp-based typography.

## External Services & CDN Dependencies

- **Flatpickr** (CDN: jsdelivr.net) — date/time picker for appointment booking
- **Formspree** (formspree.io/f/xkoqrrgy) — form submission backend in `submitCal()`
- **WhatsApp Web** (wa.me/32470432211) — pre-filled message link triggered after form submission
- **Google Fonts** — Cormorant Garamond (display) + Outfit (body)

## Key Business Logic

The qualification quiz (`qState` object in script.js) determines which offer to show based on two inputs:
- **Region**: Wallonie, Flandre, or Bruxelles
- **Status**: Propriétaire (owner) or Locataire (tenant)

Results map to three service offerings: Gaele XL (solar panels, owners in Wallonie/Flandre), Gaele Courtier (energy contracts, all regions), Yolk Advisor (solar in Brussels).

## CSS Design System

Color palette defined via CSS variables: forest greens (`--dark`, `--forest`), gold accents (`--gold`, `--gold-light`), cream neutrals (`--cream`). Border radius standardized at `--r: 12px`.
