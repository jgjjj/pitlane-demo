# UI audit — Pitlane Booking

## Direction derived from the product brief

- Dark-first mobile service booking for detailing studios.
- One tenant accent, expressive automotive photography, calm dense surfaces.
- Primary conversion is a short four-step booking path.
- Bottom navigation is limited to studio, booking and contact.
- Owner area uses the same tokens but a denser dashboard layout.

## Applied system

- Typography: Manrope for readable UI copy, DM Mono for compact metadata.
- Rhythm: 4/8px spacing base; 44px minimum interactive controls and 48px slot/date targets.
- Surfaces: near-black canvas, raised green/graphite cards, semantic foreground/muted/border/ring tokens.
- Accent: `--accent` comes from each `business.json`; no business name is hardcoded in UI logic.
- Motion: small hover/press transitions only; reduced-motion disables animation.
- Mobile: safe-area-aware fixed navigation, keyboard-friendly form fields, visible focus rings, responsive one-column service list.

## shadcn/ui implementation

The project follows the official Vite setup with Tailwind v4 and `components.json`. The screens use local shadcn components from `src/components/ui`:

- `Button` for every primary action;
- `Card` for summaries, owner panels and states;
- `Input`, `Textarea`, `Label` for accessible forms;
- `Drawer` for service details and the sequential mobile interaction pattern.

The shadcn Drawer is intentionally pinned to one API branch: current Base UI (`@base-ui/react`, `render`, `swipeDirection`). Vaul props are not mixed into this implementation. Service details use the documented Astryx `BottomSheet`.

## Interaction decisions

1. Home service cards are buttons rather than hidden navigation links, so users can inspect details before committing to a booking.
2. The service drawer exposes duration, buffer and price before the CTA.
3. Date and time are separate choices; selected states use both contrast and `aria-pressed`.
4. Confirmation exposes price as informational; server-side live booking remains the authority for final price.
5. Loading/error/success states are semantic (`role=status` / `role=alert`) and retain a clear recovery path.
6. Decorative image/icon assets are hidden from assistive technology; standalone icon controls have accessible labels.

## Verification still required locally

Run `npm install`, `npm run build`, `npm test` and `npm run test:e2e` on the developer machine. The OpenCode environment does not have Python/npm available for visual or runtime verification, so those results must not be reported as completed here.
