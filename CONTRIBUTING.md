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

Thank you!
