# Requirements: Portfolio Motion & Visual Redesign

## Introduction

The portfolio is a single-page Next.js site (hero with a WebGL ID card, About, Portfolio explorer,
Services, Contact, a chat mascot) plus project detail pages at `/portfolio/[slug]`. It works and is
accessible, but its motion is a single repeated fade-up and parts of the content are still
placeholders.

**Goal (from the owner):** the portfolio should look as good as it can and amaze visitors. The
vibe is **modern with a light futuristic edge**: current enough that it never feels dated, but not
so futuristic that it turns into a sci-fi costume.

**Scope chosen:** option (b), bold and scroll-driven, using **Lenis** for smooth scrolling and
**GSAP + ScrollTrigger** for scroll animation.

### What "modern × semi-futuristic" means for this site

To make the vibe testable, these principles apply to every requirement below.

| Do | Avoid |
|---|---|
| Dark graphite base with platinum and soft iridescent accents (matching the ID card) | Neon cyberpunk palettes, rainbow gradients |
| Thin technical lines, grid hints, small mono labels (`01 / SERVICE`, coordinates, status dots) | Dense sci-fi HUD clutter, fake data readouts everywhere |
| Large, confident display type with precise motion | Glitch effects as a default style |
| Motion that responds to the visitor (scroll, cursor) and then settles | Constant looping motion competing for attention |
| Glass and glow used as rare accents | Blur and glow on every surface |
| One signature idea per section | Every effect on every element |

Motion character: fast in, gentle settle (ease-out / expo-out), 400–900 ms for reveals, nothing
that blocks reading.

## Glossary

- **Reduced motion:** the visitor's OS setting `prefers-reduced-motion: reduce`.
- **Desktop pointer:** a device matching `(hover: hover) and (pointer: fine)`.
- **Reveal:** an entrance animation that plays once when an element scrolls into view.
- **Signature moment:** the one standout animation a section is built around.

---

## Requirement 1: Visual identity system

**User story:** As a visitor, I want the whole site to feel like one designed product, so that it
reads as polished and intentional rather than a template.

### Acceptance criteria
1. WHEN any page renders THEN colors, accents, and surfaces SHALL come from one shared set of design
   tokens (CSS custom properties) that align with the ID card palette (graphite, platinum, ink,
   soft iridescent accent).
2. The site SHALL use one consistent type scale: display font for headings, body font for text, mono
   font for small technical labels.
3. The global CSS SHALL be consolidated so that each token is defined once (today `:root` is defined
   in both `globals.css` and `visual-polish.css` with different values).
4. Glass/blur surfaces SHALL be limited to the navbar and at most one other component type.
5. A subtle film-grain overlay SHALL be applied site-wide at low opacity and SHALL NOT reduce text
   contrast below WCAG AA.

## Requirement 2: Smooth scrolling

**User story:** As a visitor, I want scrolling to feel smooth and weighted, so that the site feels
premium.

### Acceptance criteria
1. WHEN the page loads on a desktop pointer device without reduced motion THEN Lenis SHALL provide
   smooth scrolling for the whole page.
2. Lenis and GSAP ScrollTrigger SHALL share one animation loop, so scroll-linked animations stay in
   sync with the smoothed position.
3. WHEN a visitor clicks an in-page anchor (navbar links, "See my projects", "Hire me", stat cards)
   THEN the page SHALL smooth-scroll to the target, accounting for the fixed navbar height.
4. WHEN the certificate lightbox or chat mascot panel is open THEN page smooth scrolling SHALL pause,
   and scrollable areas inside them SHALL scroll natively.
5. WHEN reduced motion is on THEN smooth scrolling SHALL be disabled and native scrolling used.
6. On touch devices, native scrolling SHALL be kept (no scroll hijacking on mobile).
7. Keyboard scrolling (arrows, Page Up/Down, Space, Home/End) and browser find-in-page SHALL keep
   working.

## Requirement 3: Hero

**User story:** As a first-time visitor, I want the first screen to make an immediate impression,
so that I keep scrolling.

### Acceptance criteria
1. WHEN the page first loads THEN the headline SHALL animate in with a signature text effect (a
   "decode" where characters resolve into the final text, or a line-by-line mask reveal), finishing
   within 1.5 s.
2. The availability badge, subtitle, description, chips, and buttons SHALL enter in a staggered
   sequence after the headline starts, all finished within 2 s of load.
3. The hero SHALL have an animated background: a faint network graph (nodes and links) that drifts
   slowly, bends toward the cursor on desktop pointer devices, and occasionally shows a "packet"
   travelling along a link.
4. The network background SHALL be drawn with 2D canvas or CSS, NOT a second WebGL context (the ID
   card already uses WebGL).
5. WHEN the visitor scrolls past the hero THEN the ID card SHALL respond to scroll progress (tilt,
   scale down, and/or drift) instead of only scrolling away.
6. The "SCROLL TO EXPLORE · 01 — 04" indicator SHALL reflect the live section index.
7. The hero headline text SHALL be present in the server-rendered HTML (no blank headline before
   JavaScript runs, no layout shift when the animation starts).

## Requirement 4: Navigation

**User story:** As a visitor, I want navigation that feels responsive and tells me where I am.

### Acceptance criteria
1. WHEN the visitor scrolls down THEN the navbar SHALL stay visible, and MAY compact (less padding,
   stronger background) after the hero.
2. The active-section indicator SHALL animate smoothly between links as sections change.
3. A thin scroll-progress line SHALL show overall page progress.
4. The mobile menu SHALL open and close with an animated transition and keep its current keyboard
   and Escape behavior.

## Requirement 5: Section reveals and scroll storytelling

**User story:** As a visitor, I want each section to arrive in a way that fits its content, so that
scrolling feels like a guided story rather than the same fade repeated.

### Acceptance criteria
1. Section headings SHALL reveal line by line (masked slide-up or similar), triggered by scroll.
2. Card groups (services, projects, stats, contact panels) SHALL reveal with a stagger.
3. Stat numbers in About SHALL count up from 0 when they come into view.
4. At least one section SHALL use a pinned or scrubbed scroll sequence (e.g. the Services "Talk →
   Design → Build → Revise → Deliver" process steps progressing as the visitor scrolls).
5. Reveals SHALL play once per page load and SHALL NOT replay on scroll back up.
6. No section SHALL leave content invisible if its animation fails or JavaScript is disabled.

## Requirement 6: Portfolio section

**User story:** As a recruiter or client, I want the projects to look impressive and be easy to
explore, since they are the main reason I'm visiting.

### Acceptance criteria
1. Projects SHALL use a bento-style grid where the featured project is visibly larger.
2. WHEN a desktop pointer hovers a project card THEN the card SHALL show a cursor-following
   spotlight on its border/surface and a slight 3D tilt (max ~6°), and its image SHALL scale or
   shift subtly.
3. WHEN the visitor switches tabs (Projects / Certificates / Tech Stack) THEN the panel content SHALL
   transition in (not snap), keeping the existing animated tab indicator and keyboard support.
4. The Tech Stack tab SHALL present technologies with motion (e.g. staggered reveal or an infinite
   marquee strip) while staying readable.
5. Existing accessibility behavior SHALL be kept: tab roles and arrow-key navigation, lightbox
   focus trap, Escape to close, and focus returning to the trigger.

## Requirement 7: Project detail pages and transitions

**User story:** As a visitor, I want moving between the home page and a project page to feel
continuous.

### Acceptance criteria
1. WHEN the visitor opens a project from the home page THEN the transition SHALL use the View
   Transitions API so the project image/title animates into the detail page header.
2. WHEN View Transitions are unsupported THEN navigation SHALL work normally with no errors.
3. Detail pages SHALL use the same design tokens, smooth scrolling, and reveal patterns as the home
   page.
4. Detail pages SHALL include the site navbar (today they render without it).
5. "Back to portfolio" SHALL return to the portfolio section of the home page.

## Requirement 8: Micro-interactions

**User story:** As a visitor, I want small details to respond to me, so that the site feels crafted.

### Acceptance criteria
1. Primary buttons SHALL have a magnetic hover effect on desktop pointer devices (moving at most
   ~8 px toward the cursor) and a clear hover/press state everywhere.
2. A custom cursor (small dot plus trailing ring) SHALL appear only on desktop pointer devices, grow
   over links/projects, and never hide the native focus outline. The native cursor SHALL remain
   available for text inputs.
3. Links SHALL have an animated underline or equivalent hover treatment.
4. The contact form SHALL animate its states (focus, sending, success, error) without changing its
   current validation and submission behavior.
5. The chat mascot SHALL keep working and SHALL NOT be covered by, or conflict with, the custom
   cursor or smooth scrolling.

## Requirement 9: Accessibility and reduced motion

**User story:** As a visitor who is sensitive to motion or uses assistive technology, I want the
site to stay comfortable and fully usable.

### Acceptance criteria
1. WHEN reduced motion is on THEN all scroll-linked, looping, parallax, cursor, magnetic, and text
   scramble effects SHALL be off, and content SHALL appear immediately (simple opacity fades of
   ≤ 200 ms are allowed).
2. Animated text (decode, split lines) SHALL expose the final text to screen readers once, not
   per-character fragments.
3. All interactive elements SHALL stay keyboard-reachable with a visible focus style.
4. Text contrast SHALL meet WCAG AA against every background, including over the network canvas and
   grain overlay.
5. Decorative canvases and overlays SHALL be `aria-hidden` and SHALL NOT capture pointer events
   intended for content.

## Requirement 10: Performance

**User story:** As a visitor on an ordinary laptop or phone, I want the site to load fast and scroll
smoothly.

### Acceptance criteria
1. Scrolling and hero animation SHALL hold ~60 fps on a mid-range desktop with the WebGL card visible.
2. Largest Contentful Paint SHALL be ≤ 2.5 s and Cumulative Layout Shift ≤ 0.1 on a production build
   (Lighthouse, desktop profile).
3. New animation dependencies (GSAP, ScrollTrigger, SplitText if used, Lenis) SHALL add no more than
   ~80 KB gzipped to client JavaScript.
4. Animations SHALL use transform and opacity only (no animating layout properties on scroll).
5. The network canvas and other loops SHALL pause when off-screen or when the tab is hidden.
6. On narrow viewports (≤ 680 px) heavy effects (network cursor reaction, custom cursor, magnetic
   buttons, tilt) SHALL be disabled or simplified.
7. `npm run build` SHALL pass.

## Requirement 11: Content readiness

**User story:** As the site owner, I want placeholder content tracked, so that the redesign doesn't
launch with "Your Name" and TODO text.

### Acceptance criteria
1. The spec SHALL list every visible placeholder; the owner provides real values before launch:
   - Name: `profile.name`, `profile.firstName` (currently "Your Name"), page title and Open Graph
     title in `layout.tsx`, footer on detail pages ("[YOUR NAME]").
   - Email, GitHub URL, LinkedIn URL, location (`[TODO: ...]` in `profile.ts`).
   - Portrait image (About uses `profile-placeholder.svg`; the ID card photo is `null`).
   - Live site URL (`PORTFOLIO_URL` and `NEXT_PUBLIC_SITE_URL`, currently `example.com`).
   - Copy that reads as unfinished: "Public contact links will be added here", "I am exploring these
     project types and will confirm each service…", "My contribution: Details will be added…".
2. The hero role, chips, and ID card SHALL describe the same person consistently (today the hero
   says "IT student. Developer." with Java/JavaFX chips, while the card says Backend · Networking).
3. Until real values exist, the build SHALL still pass and placeholders SHALL degrade gracefully (as
   the contact links already do).

## Out of scope
- Redesigning the ID card artwork (tracked separately; see the ID card design notes).
- Changing the backend, contact API, or chat mascot logic.
- A light theme.
