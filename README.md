# BEANNEL

Live POS, inventory, ledger and profit tracking for the store. This is the app behind [apex-market-seven.vercel.app](https://apex-market-seven.vercel.app).

- Sign in with email or Google
- Ring sales, track stock by department, and watch the books
- Owner PIN for advisor and settings
- Wipe requires PIN, typing `WIPE`, then a two-second hold

Your live Supabase project stays the same. Existing accounts, stock and sales are not wiped by this upgrade.

## Run

```bash
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`). On Vercel those keys are already on the project.
