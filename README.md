# Sketch2CAD Web (Next.js 16.3)

Sketch & architectural floor plans → parametric CadQuery scripts.  
**Instant Navigations** (`cacheComponents` + `partialPrefetching`), **Stripe test-mode** subscriptions.

## Stack
- Next.js **16.3** App Router + Instant Navigations
- Stripe Checkout (subscription tiers: Free / Starter / Pro / Team)
- In-app Studio: walls · doors · windows · voice commands
- Optional Python CAD backend (see monorepo `../sketch2cad`)

## Local
```bash
npm install
cp .env.example .env.local
# add Stripe test keys when ready
npm run dev
```

## Stripe test mode
1. https://dashboard.stripe.com/test/apikeys → copy `sk_test_` / `pk_test_`
2. Create 3 Products with recurring monthly Prices → copy Price IDs
3. Set env:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO` / `STRIPE_PRICE_TEAM`
   - `STRIPE_WEBHOOK_SECRET` (from `stripe listen` or Dashboard)
4. Test card: `4242 4242 4242 4242`

## Vercel
Set the same env vars in Project Settings → Environment Variables.

## Instant Navigations
```ts
// next.config.ts
cacheComponents: true,
partialPrefetching: true,
```
Routes export `instant = true` and use `loading.tsx` / `<Suspense>` shells.
