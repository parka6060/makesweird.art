// Username matches are exact (lowercase). Thing matches are case-insensitive substrings.

export const BANNED_USERNAMES = [
  // evil
];
export const BANNED_THINGS = [
  // just incase
];

export function isBannedThing(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BANNED_THINGS.some((t) => lower.includes(t.toLowerCase()));
}
export function isBannedUsername(name) {
  if (!name) return false;
  return BANNED_USERNAMES.includes(name.toLowerCase());
}
