https://makesweird.art

Is a minimal _single purpose_ habit/ritual tracker for making weird art (or anything else) every day. No email, no password, just a single secret token used to sync your streak across different devices. Check in daily, build a streak, see what other are making on the leaderboard, and chat with the community, if you want.

Miss one day? Your streak is safe. Miss two in a row? It resets.

---

# Philosophy

1. **Minimal footprint:** The entire site is tiny (bandwidth) by design.
2. **Ephemeral:** The chat stores 100 messages at a time.
3. **Privacy-first**: No email, no tracking, no analytics.

---

# Stack

1. pure vanilla html, css, js
2. chat uses [PartyKit](https://partykit.io) for websockets
3. Redis for db.

---

# Data Storage
MWA (makesweird.art) stores no identifying information.

## your 'Account'
When you first visit, a random token is generated in your browser and saved to localstorage. **This is your only identifier.**
**If you don't assign a username**, everything tied to your token is automatically deleted after 30 days of inactivity via TTL expiry.
**If you claim a display name**, your data is kept for 1 year of inactivity instead.

Stored against your token:
- when you signed up
- your current streak
- your total check-ins as a running count
- when you last checked in
- what you're making (your 'thing')
- your timezone inferred from ip used to calculate cooldown
- your display name
- your check-in history as a set of dates

## your ip is used for
- rate limiting, not stored permanently
- timezone detection
- ban enforcement, if your ip is banned it's added to a blocklist & storred permanently. this only happens in abuse cases.

your IP is never stored against your token, but if you use chat with a display name, your IP is stored alongside that message and name server-side.

---

## License

AGPL-3.0

This code is free to use, modify, and distribute under the terms of the AGPL-3.0 license. **However** fascists, white supremacists, anti-LGBTQ+, and hate groups are explicitly unwelcome.
