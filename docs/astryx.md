# Astryx integration

Astryx is an agent-readable React/StyleX design system. The official CLI is `@astryxdesign/cli`; the bare `astryx` package is intentionally not used.

Commands:

```bash
npm run astryx:docs
npm run astryx:components
npm run astryx:search -- "theme provider"
npx @astryxdesign/cli component <Name>
```

The workspace did not contain the Astryx commands or initialization instructions referenced by the missing original plan, so no undocumented Astryx props or CSS provider are invented here. Before adding an Astryx component, run `component <Name>` and commit the documented dependency/configuration output. The app uses Astryx `Theme` + `neutralTheme`, supplied Astryx CSS and documented `Button`/`BottomSheet` props. shadcn remains the local form/card layer; its Drawer is pinned to current Base UI (`@base-ui/react`, `render`, `swipeDirection`) and is not mixed with Vaul props.
