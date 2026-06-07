# CLAUDE.md — Forge

Personal fitness PWA. **Single user (the owner). Not a product.** Read `spec.md` for full feature spec and data model before building anything.

## What this is

Next.js 16 (App Router) + Supabase + Gemini 2.5 Flash + Vercel. Dark Whoop/Strava-style UI. Tracks workouts, diet, weight, sleep, smoking, mood, photos. AI chat with full data context.

## Commands

```bash
npm run dev          # local dev (Turbopack by default in v16)
npm run build        # verify before pushing — Vercel deploys main
npm run seed:foods   # seed food database
npm run seed:workout # seed workout plan
npx supabase db push # apply migrations (or run SQL in dashboard)
```

## Stack versions (do not downgrade)

- Next.js 16 + React 19.2
- Tailwind CSS v4 (CSS-first, no tailwind.config.ts)
- shadcn/ui v4 (preset `b5BbmAxeeg`)
- Supabase JS v2
- Zod v4, Vercel AI SDK v6, @ai-sdk/google v3

## Architecture rules

- **Server actions for all mutations.** No client-side API route fetching for CRUD. Forms call server actions directly.
- **API routes only for:** `/api/login` (password check) and `/api/chat` (AI streaming, edge runtime).
- **Supabase access:** server-only via `createServiceClient()` in `lib/supabase.ts`. NEVER import this in client components (`'use client'`). No RLS configured — security is the password gate.
- **Auth:** `proxy.ts` checks signed JWT cookie against `SESSION_SECRET`. That's the whole auth system. Don't add user tables, sessions tables, or auth libraries.
- **Validation:** zod schemas in `lib/schemas/`, shared by forms and server actions.
- **Dates:** store as `date` (not timestamptz) for day-keyed logs (weight, sleep, etc.). One row per day, upsert on conflict.
- **Macros are computed, not stored.** `meal_items` stores quantity; calories/protein/etc. derive from `foods` per-100g values at query time.
- **Navigation:** 5-tab bottom nav (mobile) — Today / Diet / Workout / Chat / More. Today is the hub; diet logging is inline on Today. More tab holds Phase 2+ trackers and charts.
- **Training day targets:** detected automatically — query `workout_sets` for today; if rows exist → 1950 kcal training targets, else → 1750 kcal rest day targets. No manual toggle.
- **Workout auto-resume:** `/workout` checks for an in-progress workout (has `workouts` row for today without `completed_at`). If found, loads it directly — no prompt.

## Next.js 16 conventions (IMPORTANT)

- **Auth proxy:** `proxy.ts` at root (not `middleware.ts`). Export function named `proxy`, not `middleware`.
- **Async APIs:** `cookies()`, `headers()`, `params`, `searchParams` are ALL async — always `await` them. Synchronous access is removed in v16.
- **Turbopack:** is default in v16 for both dev and build — do NOT add `--turbopack` flag to scripts.
- **`unstable_` prefix removed:** use `cacheLife`, `cacheTag` directly from `next/cache`.
- **`revalidateTag` requires second arg:** `revalidateTag('key', 'max')` — single-arg form throws TS error.

## UI rules — shadcn (CRITICAL, read carefully)

### Always use shadcn components. Never write raw HTML equivalents.

| Need | Use | Never use |
|---|---|---|
| Button | `<Button>` from `@/components/ui/button` | `<button>` |
| Text input | `<Input>` from `@/components/ui/input` | `<input>` |
| Card container | `<Card>`, `<CardHeader>`, `<CardContent>` | raw `<div>` with border |
| Form | shadcn Form + react-hook-form or native form | custom form wrappers |

### When you need a component not yet added to the project:
1. Check the shadcn MCP: `mcp__shadcn__search_items_in_registries` or `mcp__shadcn__list_items_in_registries`
2. Add it: `npx shadcn@latest add <component>`
3. Then import from `@/components/ui/<component>`

**Never build a custom component if shadcn has one.** Check first.

### Tailwind v4 styling rules

- **Colors:** always use design tokens — `bg-background`, `text-foreground`, `border-border`, `text-primary`, `text-muted-foreground`, etc. Never hardcode colors (`bg-black`, `text-white`, `#09090b`).
- **Opacity on tokens:** use Tailwind's `/` modifier — `bg-background/50`, `border-border/30`. This works correctly with oklch variables.
- **Shadows with CSS vars:** use `color-mix()` not `rgba()`. oklch variables don't work in `rgba()`. Correct: `shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_30%,transparent)]`.
- **No `tailwind.config.ts`:** v4 is CSS-first. All theme config lives in `@theme inline {}` in `globals.css`.
- **Font families:** `font-sans` (Oxanium), `font-heading` (Noto Serif) — defined via `@theme inline` in globals.css.
- **`@apply` in `@layer base`:** valid in v4, but prefer plain CSS property declarations for base resets.
- **`tw-animate-css`:** import via `@import "tw-animate-css"` in globals.css. Do NOT use `tailwindcss-animate` (v3 plugin).

### Component patterns

- Touch targets ≥44px (`min-h-[44px]` or `h-14`). Used mid-workout with sweaty hands.
- Recharts for charts. Import styles consistent with shadcn chart tokens (`--chart-1` through `--chart-5`). No other chart libraries.
- Mobile-first. Desktop supported via `md:` breakpoint.
- Icons: `HugeiconsIcon` from `@hugeicons/react` + icon data from `@hugeicons/core-free-icons`.

## AI integration rules

- All AI calls through Vercel AI SDK (`streamText`), model `gemini-2.5-flash` via `@ai-sdk/google`. Provider must stay swappable (one-line change to DeepSeek/OpenRouter later).
- Chat route: fetch last 90 days of all data in `Promise.all`, format compact (markdown tables, not JSON dumps), inject into system prompt with the static plan docs.
- Plan docs (`docs/hypertrophy-plan.md`, `docs/diet-plan.md`) are loaded once and cached in module scope — not re-read per request.
- **Never call AI automatically on page load.** Free tier is 1,500 req/day. AI fires on user action only (send message, click insight button).
- Insight buttons cache results in `ai_insights` — check cache before generating.

## Quality bar — IMPORTANT, read this

This is a personal tool, not production SaaS. Calibrate accordingly:

**DO:** TypeScript strict, zod on writes, clean component structure, fast interactions.

**DON'T (even though you'll want to):**
- No error boundaries on every component — one root boundary is enough
- No i18n, no a11y audits, no SEO (it's password-gated)

When in doubt: **the simplest thing that works today.** The owner is a senior FE dev who will refactor when actually needed.

## File conventions

```
app/
  (auth)/login/          # password gate page
  (app)/                 # everything behind proxy.ts
    page.tsx             # today dashboard
    diet/
    workout/
    chat/
    trends/              # charts (phase 2)
  api/login/route.ts
  api/chat/route.ts      # edge runtime
lib/
  supabase.ts            # server-only client (createServiceClient)
  session.ts             # JWT encrypt/decrypt
  schemas/               # zod
  ai/context.ts          # data fetching + formatting for AI
  ai/prompts.ts          # system prompt + insight templates
components/
  ui/                    # shadcn components (auto-generated, don't hand-edit)
  nav/                   # bottom-nav.tsx, sidebar.tsx
proxy.ts                 # auth guard (Next.js 16 convention)
scripts/                 # one-time seeds (tsx)
docs/                    # hypertrophy-plan.md, diet-plan.md (AI context source)
supabase/migrations/
```

## Env vars required

```
NEXT_PUBLIC_SUPABASE_URL=      # from Supabase dashboard → Settings → API Keys
SUPABASE_SECRET_KEY=           # sb_secret_... (new format, not legacy service_role JWT)
GOOGLE_GENERATIVE_AI_API_KEY=
APP_PASSWORD=
SESSION_SECRET=                # 32 random chars: openssl rand -base64 32
```

## Gotchas (learned, don't rediscover)

- **`proxy.ts` not `middleware.ts`**: Next.js 16 renamed middleware to proxy. Edge runtime is not supported in `proxy` — it runs Node.js.
- **oklch + rgba = broken**: CSS vars with oklch values don't work inside `rgba()`. Use `color-mix(in oklch, var(--token) 30%, transparent)` for opacity on arbitrary colors.
- **Tailwind opacity modifiers work**: `bg-primary/50` works fine. Only `rgba()` is broken.
- Edge runtime on `/api/chat`: no Node-only packages. supabase-js and AI SDK are safe.
- iOS PWA installs via Safari only. `apple-touch-icon` at `/public/apple-touch-icon.png` required. Storage evictable — DB is the only source of truth.
- Supabase free tier pauses after 7 days idle. Daily use prevents it; if paused, resume from dashboard (no data loss).
- `weight_logs` etc. have unique date constraint — always upsert, never insert.
- Rest timer must survive screen lock on iOS: use timestamp math (`endTime - now`), never `setInterval` counting.
- `foods` and `exercises` tables have `UNIQUE` on `name` — seed scripts can use `upsert({ onConflict: 'name' })`.

## Current state

- [x] Phase 0: Setup + password gate + app shell + PWA install + full DB schema + seed scripts
- [ ] Phase 1: Diet logging
- [ ] Phase 2: Workout logging
- [ ] Phase 3: AI chat
- [ ] Phase 4: weight/photos/trackers/charts/insights (in More tab) 

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output CLAUDE.md|01-app:{04-glossary.mdx}|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-fetching-data.mdx,07-mutating-data.mdx,08-caching.mdx,09-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{ai-agents.mdx,analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching-without-cache-components.mdx,cdn-caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,deploying-to-platforms.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,how-revalidation-works.mdx,incremental-static-regeneration.mdx,instant-navigation.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,migrating-to-cache-components.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,ppr-platform-guide.mdx,prefetching.mdx,preserving-ui-state.mdx,preventing-flash-before-hydration.mdx,production-checklist.mdx,progressive-web-apps.mdx,public-static-pages.mdx,redirecting.mdx,rendering-philosophy.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,streaming.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx,view-transitions.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions/02-route-segment-config:{dynamicParams.mdx,instant.mdx,maxDuration.mdx,preferredRegion.mdx,runtime.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,catchError.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,turbopackIgnoreIssue.mdx,turbopackLocalPostcssConfig.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|01-app/03-api-reference/07-adapters:{01-configuration.mdx,02-creating-an-adapter.mdx,03-api-reference.mdx,04-testing-adapters.mdx,05-routing-with-next-routing.mdx,06-implementing-ppr-in-an-adapter.mdx,07-runtime-integration.mdx,08-invoking-entrypoints.mdx,09-output-types.mdx,10-routing-information.mdx,11-use-cases.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-params.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,logging.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|02-pages/04-api-reference/06-adapters:{01-configuration.mdx,02-creating-an-adapter.mdx,03-api-reference.mdx,04-testing-adapters.mdx,05-routing-with-next-routing.mdx,06-implementing-ppr-in-an-adapter.mdx,07-runtime-integration.mdx,08-invoking-entrypoints.mdx,09-output-types.mdx,10-routing-information.mdx,11-use-cases.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
