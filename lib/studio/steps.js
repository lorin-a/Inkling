/**
 * The steps, named once. The sidebar reads from here and nowhere else.
 *
 * Each step is one screen. The order is the process: look at everything,
 * say your first words alone, vote alone, see your sort, compare with your
 * partner, pull the colors out of what survived, group and name it, and then
 * the brief. Nothing advances on its own: `status()` only reports where the
 * material is; the person chooses where to stand.
 *
 * [provisional] Every title and line here is Claude's wording; Lorin to accept
 * or replace once she has heard them in a real session.
 */

export const STEPS = [
  { key: "look", n: 1, title: "Look", line: "Everything you gathered, before any judgment. Click a card to start voting from it." },
  { key: "words", n: 2, title: "First words", line: "Three words for how the brand should feel, written alone. Your partner sees them at Compare." },
  { key: "vote", n: 3, title: "Vote", line: "One card at a time. Keep, maybe, no, or undecided. Say why if you want to." },
  { key: "sort", n: 4, title: "Your sort", line: "Your votes as four columns. Drag a card to change its vote." },
  { key: "compare", n: 5, title: "Compare", line: "Where you and your partner agree, and where you split." },
  { key: "colors", n: 6, title: "Colors", line: "The colors pulled from what you kept, as cards you can copy from." },
  { key: "group", n: 7, title: "Group and name", line: "Draw a group around what belongs together. Name it, and say what it is not." },
  { key: "brief", n: 8, title: "Brief", line: "Assembles from what you named and locked. Not in this build yet." },
];

export const STEP_INDEX = Object.fromEntries(STEPS.map((s) => [s.key, s]));

/**
 * One line per step for the sidebar: what is done, what is in progress,
 * what is waiting on someone else.
 */
export function statusOf(key, m) {
  const { total, voted, myWords, wordsSkipped, people, revealOpen, colorsPulled, groups, namedGroups, onBoard2 } = m;
  const partner = people.find((p) => !p.me);
  switch (key) {
    case "look":
      return voted > 0 ? { state: "done", text: `${total} cards` } : { state: "now", text: `${total} cards` };
    case "words":
      if (myWords > 0) return { state: "done", text: `${myWords} ${myWords === 1 ? "word" : "words"}` };
      if (wordsSkipped) return { state: "done", text: "Skipped" };
      return { state: voted > 0 ? "todo" : "next", text: "Optional" };
    case "vote":
      if (total === 0) return { state: "todo", text: "Nothing to vote on yet" };
      if (voted >= total) return { state: "done", text: `${voted} of ${total}` };
      return { state: voted > 0 ? "now" : "next", text: `${voted} of ${total}` };
    case "sort":
      if (voted === 0) return { state: "todo", text: "After you vote" };
      return { state: voted >= total ? "now" : "todo", text: `${voted} sorted` };
    case "compare":
      if (revealOpen) return { state: "now", text: "Open" };
      if (!partner) return { state: "todo", text: "Invite your partner" };
      if (voted < total) return { state: "todo", text: "After you both vote" };
      return { state: "waiting", text: `${partner.name}: ${partner.voted} of ${total}` };
    case "colors":
      return colorsPulled ? { state: "done", text: "Pulled" } : { state: voted > 0 ? "next" : "todo", text: "From what you keep" };
    case "group":
      if (groups > 0) return { state: namedGroups === groups ? "done" : "now", text: `${namedGroups} of ${groups} named` };
      return { state: onBoard2 > 0 ? "now" : "todo", text: onBoard2 > 0 ? `${onBoard2} cards` : "After you keep some" };
    case "brief":
      return { state: "later", text: "Later" };
    default:
      return { state: "todo", text: "" };
  }
}

/** Where a person who just opened the link should stand. */
export function suggestedStep(m) {
  if (m.voted === 0) return "look";
  if (m.voted < m.total) return "vote";
  if (m.revealOpen && !m.colorsPulled && m.groups === 0) return "compare";
  if (m.groups > 0) return "group";
  return "sort";
}
