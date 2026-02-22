# contributing!

thank you for wanting to contribute to MWA. this document explains our philosophy and pull request process.

# purpose & philosophy

- purpose: the core of MWA is focused around daily ritual and community. it's not really about the streak, rather doing something everyday no matter how small or what it is.
- footprint: changes should favour small sized (as small as you can get it) clear and unabstracted code that don't rely on new dependencies.
- privacy: we avoid collectiong personal data.
- community & social: features should help people make and share rituals! build a sense of community!

# what to contribute

- fixes: bugs, accessibility, performance, security, all is welcomed and desperately needed!
- docs: readme, api documentation are all great!
- small features: small improvements that are low risk, and alighed with minimal philosophy. eg. accessbility toggle, better focus states, ui ux improvements that don't bloat the code.
- large features/new sections should be discussed via an issue first, please do not open a PR that adds major new functionality without prior discussion.

# styles & convention

- stick to vanilla html, css, and js.
- follow the existing style. dont reformat entire files!
- js: use plain js and avoid build steps/transpilers where possible.

# pull request process

1. ooen an Issue first for non-trivial changes (new pages, features, or anything that changes data handling). use the issue to discuss design, community, and privacy implications.
2. create a branch from `main` with a descriptive name: `fix/<short-desc>` or `feat/<short-desc>`.
3. keep PRs small please, this makes things easy to review.
4. in the PR description include:
   - what the change does and why??
   - sreenshots for UI changes ( include desktop + mobile if relevant).
   - any migration or compatibility notes.
5. run a quick manual smoke test: open the site locally and confirm the change works on desktop and mobile widths.

---

Thank you! Here's how to get things running locally.

---

# running mwa locally

if you want to run the site while developing, there are two ways:

1. client preview (no server/API)
   - Useful to iterate on HTML/CSS/JS UI that doesn't require the server APIs (checkin, chat, leaderboard).
   - From the repo root:

   ```bash
   npm install -g serve   # if you don't already have a static server
   serve public -s -l 3000
   # then open http://localhost:3000
   ```

2. the full thing with a backend?
   - Prerequisites:
     - Node.js 18+ and `npm` or `pnpm`/`yarn`.
     - A Redis instance accessible via Upstash (recommended) or another Redis-compatible REST endpoint.
     - (Optional) Vercel CLI for running serverless functions locally: `npm i -g vercel`.

   - Required environment variables

     Create a `.env.local` file in the project root (this file is ignored by git) and set:

     ```env
     mwa_KV_REST_API_URL=<your upstash redis rest url>
     mwa_KV_REST_API_TOKEN=<your upstash rest token>
     ```

     Notes:
     - The API code expects a REST-style Upstash Redis URL and token. See Upstash docs for creating a Redis database and copying the REST credentials.
     - Chat uses PartyKit (a hosted websocket provider). The client currently points at a production PartyKit host; you can run the site without a PartyKit setup but chat will be read-only/offline unless you configure a PartyKit instance.

   - Run locally with Vercel (serverless emulation)

   ```bash
   npm install
   vercel login           # once, if you haven't already
   vercel dev             # runs the static site + api functions locally
   # open http://localhost:3000
   ```

   - alternatively run and iterate on serverless functions with `node`+lightweight server frameworks, but `vercel dev` is the simplest match to production behavior.

That's all you need!
