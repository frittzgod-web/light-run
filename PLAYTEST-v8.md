# Light Run — v8 playtest notes (16 Nov 2026)

Played as a phone player: Playwright with mobile emulation and real touch events (CDP `touchStart/Move/End`) at **390×844** and **360×740**, graphics set to Balanced.
Covered: title, every title menu, the creator, the tutorial, free runs, stumbles and crashes, rising again, checkpoint restarts, roadside moral encounters, answer gates, verse scrolls, all 3 power-ups, slide/roof/grind/launch patterns, all 3 bosses, every later zone, pause and settings, arrival, the camp (all 8 pilgrims), Bible study, the Holy Ghost Service, the ending and the start of Chapter 2.
Screenshots are in `screenshots3d/v8/playtest/`. Scripts are in `tests/` (`swipe8.js`, `stops.js`, `play8*.js`).

## A. Fixed in v8

| # | Priority | Area | Problem found | Fix |
|---|---|---|---|---|
| 1 | P0 | View obstruction | A big green bus-stop sign hung **over the middle of the road** on every footbridge. | Moved to a **roadside sign on the right verge** (x≈8.6, off all three lanes), angled toward the runner. It still flashes when you pass the stop. |
| 2 | P0 | View obstruction | Entering a zone or reaching a bus stop showed a **big centre-screen card** (`#zoneCard`) for about 2.3 s, right over the road ahead. | Removed it from the run. The zone now shows in the existing HUD pill (`🗺️ Berger · KM 4`, yellow flash, 2.6 s). Nothing new is drawn over the road. |
| 3 | P0 | View obstruction (bug, existed in v7) | The gate result card (`✅ Correct! +50 · …`) **never hid after a gate**. The next gate is created about 0.7 s after you pass, which broke the 2.4 s hide timer, so the card stayed at the top of the screen for ~25 s, until the next question. | The card now hides 2.4 s after the gate, even if the next gate already exists. It also clears on a checkpoint restart. Verified: hidden at about 3.4 s (v7: still showing after 9 s+). |
| 4 | P0 | Controls | A long swipe moved **two lanes** (left → extreme left) because a "same-direction chain" fired a second move at about 66 px. | **One gesture = one lane.** It latches until the finger lifts, and still fires at the first threshold (~20 px). Lane spring is tighter (24 → 30) and the camera follows faster (8.5 → 11). Arrow keys move one lane per press and ignore auto-repeat. |
| 5 | P1 | Boss card | The boss banner sat near the middle of the screen for 2.6 s. | Made compact, placed under the question bar (top 186 px), shown for 1.9 s. |
| 6 | P1 | Title / Daily | The Daily panel had no close button. Its only button, "Let's run ▶", just closed the panel without starting a run. | "Let's run ▶" now starts or continues the run, and a **Close** button was added. |
| 7 | P1 | HUD | The info pill (`KM 9.5 · Warewa 6.5 km · 100 km/h`) was **cut off with "…"** whenever the combo or power chip was showing. | Shortened to `➜ Warewa 6.5 km · 100 km/h`. The map strip already shows the total KM. |
| 8 | P2 | Camp HUD | In the camp, the pause button covered the score pill (`✨ 73|20`). | The HUD now reserves space for the pause button wherever it is visible. |
| 9 | P2 | Camp visuals | The camera looks down in the camp, so the ground cut the lantern glow into a **hard-edged square**. | The glow ignores depth in the camp only, so it is round again. |

Tests: `tests/swipe8.js` checks touch and mouse at both sizes:
- a fast 300 px swipe moves **exactly 1** lane, in both directions
- right lane + a long left swipe lands in the **middle**
- a slow 300 px drag and a swipe with a flick-back each move 1 lane
- **two swipes move 2 lanes**
- one arrow press, or a held arrow with auto-repeat, moves 1 lane

All pass. Against v7, the same test reproduces the bug: `0 → 2` and `2 → 0`. Lane settle time is now about 250–400 ms.

## B. Recommended (bigger design changes, not done)

**P1: difficulty and pacing**
1. The first 1–2 km feel slow (24–25 u/s, about 87 km/h in the HUD) and nearly empty. Teens will judge the game in the first 20 seconds, so consider starting at about 28 and bringing the first jump/slide combo forward.
2. A single danfo/truck hit at km 2–3 ends the run straight away. Bigger vehicles could cost one "stumble" (like cones) for the first 3 km of chapter 1, so first-timers don't fall before the first bus stop.
3. Roadside moral encounters can open **during a boss intro**. We saw this when jumping to the Ibafo go-slow, where the stop sits at km 28 and the boss starts at 28.5. Consider moving that stop's encounter before the boss, or holding it until the boss is cleared.

**P1: readability**
4. The answer-gate labels sit at the horizon above the gates, so on 360-wide phones a long answer ("John the Baptist") uses most of the lane width. Consider a 2-line label, or shorter answer text in `content.js`, for answers over 14 characters.
5. Several features now share the top of the screen: the HUD, the map strip, the question bar and the verse strip. Merging the verse strip into the map strip during gates would give back about 30 px of sky.

**P2: UI/UX**
6. Creator tabs scroll sideways, but nothing shows that more tabs (Bottom, Shoes, Extras, Outfits) are off-screen. Add an edge fade or a "›" hint.
7. On the title screen, the Shop and Daily badges (`💡0`, `0/3`) overflow their buttons by about 5 px. This looks intentional, like a corner badge, but could be tidied.
8. The "Answer gates" tutorial card stays up until the first real gate (about 10 s). A "Got it" tap would help.
9. The camp camera sits close and looks down, so the ground looks bare in places (Main Gate, auditorium floor). Pulling the camera back a little or adding ground props (benches, banners, crowd) would make the camp feel as busy as the road.
10. The pause menu has no "restart from last bus stop" option. Players can only resume or quit.

**P2: fun factor**
11. Add a short "near miss" reward (+5 light and a whoosh) for dodging a vehicle at the last moment. It is cheap to do and adds adrenaline.
12. Give a combo milestone at ×5 or ×10 its own little celebration, such as a camera FOV kick plus a Bible-word pop ("Faithful!").
13. Make the bosses show a visible progress bar (e.g. "Storm 40%") so they feel like set pieces with an end.
14. Weekly youth-group board: invite codes work in demo mode, but the shared server isn't switched on yet. Real cross-phone rankings would be the biggest boost to keeping players coming back.

**P3: content**
15. Verse blanks on the arrival card show as `☐ ☐`. Consider `____` so they never fall back to a missing-glyph box on older Android fonts.

## C. Health

- No console errors or page errors anywhere in the playtest, at either size.
- Draw calls: run ~100–140, camp ~33. Frame rate (software-rendered test machine) is 28–42 fps on Balanced. Real phones run on the GPU and will be faster.
- Load time to the title screen: about 4.2 s on the local server.
- `reg7.js` (both sizes), `smoke.js`, `camp.js` and `swipe8.js` all pass.

## D. v9 (16 Nov 2026): recommendations implemented
- **Gentle start:** in chapter 1, or a player's first 3 runs, a danfo, truck or okada hit before KM 3 now costs −40, some light and a short slowdown, followed by 1.6 s of invulnerability. It no longer ends the run, and a double stumble there doesn't either. Full stakes return after KM 3. The start is quicker (22, was 20). Extra light trails appear in free lanes for the first 2.5 km, the easy traffic mix runs until KM 2, and Ojota always asks an easy warm-up question in chapter 1.
- **Boss clash:** roadside encounters are scheduled outside every boss window (the window runs from 0.6 km before the boss to 0.15 km after it). As a second guard, an encounter never opens while a boss is active. The debug jump (`LR.km`) now moves the encounter schedule along too.
- **Less crowding:** short answer versions are used ("Good Samaritan", "Judas", "Galilee"…). Answers longer than 11 characters use a smaller font and wrap to two lines, and three of them fit across a 360 px phone. While a question is showing, the info pill, stop names and verse strip hide.
- **Small touches:**
  - The creator tabs fade at the edge and show a nudging › button.
  - The "Answer gates" tutorial card is a single line and closes after 4 s.
  - The camp has 12 tents, avenue banners, mats and coolers, food-court bunting and about 25 more people (fewer on the low graphics tier).
  - The camp camera is pulled back, and trees and palms between the camera and the player are hidden.
  - The pause menu has "↩ Restart from <last bus stop>".
- **More thrill:**
  - Near misses give a little light and a haptic tap.
  - A new "⚡ Last-second dodge!" (+25 × combo) rewards changing lane in the last 0.45 s.
  - Combo milestones at 10/25/50/100/200 give a bonus, a burst, an FOV kick, a haptic and a badge flash.
  - Bosses show a slim progress bar in the HUD.
- **Leaderboard:** still in demo mode. Switching it on means filling in `js/lb-config.js` (see LEADERBOARD.md) and bumping the `sw.js` VERSION.

## E. v10 (16 Nov 2026): the Bible map and the first three vision worlds

**What's new**
- **Bible map** (📖 button on the title screen): all 66 books in 10 sections. Genesis, Exodus and Leviticus are playable; the other 63 say "Soon". Books unlock in order (Exodus after Genesis, Leviticus after Exodus). Each tile shows stars, and a book card shows the intro, the boss, your best score and the verses you've saved.
- **Vision gates on the journey:** about 70 m past the Ojota bus stop a glowing portal opens into a book world (once per chapter). You run the vision with 3 question gates, verse scrolls and a boss, then come back out on the expressway near Berger. Standalone visions run from the Bible map. `?novision` turns the journey gate off.
- **Worlds and bosses:**
  - **Genesis, the Garden of Eden:** fruit trees with gold fruit, flowers, fountains, lion statues and a golden palace. Boss: **The Flood**, with waves that push you a lane, rain and rising water.
  - **Exodus, the Red Sea:** a seabed path between water walls with fish, sharks, coral, sunken chariot wheels and light shafts. Boss: **Pharaoh's chariots**, which flash a lane warning and then charge. Jump them or change lane.
  - **Leviticus, the Holy Road:** an aqueduct bridge over a canyon, with olives, mesas, a domed city and the tabernacle. Golden oil lamps and silver coins are the collectibles. Boss: **The Collapse**, with falling stones that cast shadows first.
- **New pieces:** a golden shield bubble with a cross, angel wings (6 s glide with a magnet), a parchment scroll with a wax seal, and the obstacles from the concept art (lion statue, carved pillar, broken arch, fallen column, clay pots, coral, wreck).
- **Questions and verses:** 19/18/18 KJV quiz questions and 7 verses per book (see **CONTENT-REVIEW.md**). Stars: ★ finish, ★★ 2 of 3 gates right, ★★★ all 3 right plus the whole verse.
- **HUD:** shield badge with the light bar, a gold SCORE, COINS, and a rounded square pause button. The boss "gust" banner is now a slim strip at the top, not over the runner.
- **Saves and shop:** progress saves in `lr3d_bible`. New dailies (finish a vision, answer book questions, use wings). New shop lantern: "Golden oil lamp" (750 light, Leviticus 24:2).

**Tested (headless Chrome, 390×844 and 360×740)**
- `tests/v10.js` passed with no JS errors. It covers the map, Genesis ★★★ on autopilot, wings, unlocks, the Exodus chariot warning, Leviticus lamps, the fallen-in-vision modal, and the journey gate → vision → back near Berger.
- `tests/jfull.js`: the full journey on autopilot reached camp (km 46) through the Genesis vision, with no errors.
- `tests/v10low.js`: battery tier visions run at 43–55 draw calls.
- The swipe, regression, smoke and camp suites all passed.

**Needs a person**
- A pastor or teacher should read CONTENT-REVIEW.md before wider release.
- Check on a real low-end phone that it runs smoothly. Headless fps doesn't show this.

## F. v11 (16 Nov 2026): the player is always in control, and questions are readable while running

**Why the runner sometimes moved by itself (root causes, now fixed)**
1. **Storm on Long Bridge (journey boss):** every few seconds a "wind gust" moved the runner one lane. Now the wind throws **debris into one lane**. A red strip flashes on that lane with a "💨 Debris in the … lane!" banner, the debris lands ahead, and you jump it or move. Your lane never changes on its own.
2. **The Great Flood (Genesis boss):** waves also moved you a lane ("Carried by the wave"). Now a **wave rolls down one warned lane**, and you jump it or change lane.
3. **Ghost taps:** a tap that began on a button, card or menu, or while the game was paused or a dialog was open, could finish on the game screen as a **jump**. Now only gestures that start on the game while it is running count, with a short quiet window after any UI tap.
4. **Held keys:** holding ↑ or ↓ on a keyboard repeated jumps and slides. Now one press gives one action.
5. **Leftover inputs after pausing:** a jump or slide queued before a pause no longer fires after you resume.
6. **The test autopilot** only runs with an explicit `?autopilot` in the address and is never saved. When it is on, a red "TEST AUTOPILOT" badge shows.

Still automatic, by design, and clearly visible: running onto a **ramp** (danfo/truck ramps, the okada launch ramp, grind rails) lifts you onto it; **angel wings** glide you above the road for 6 s. None of these ever changes your lane.

**Questions you can read while running**
- The question sits in a solid dark bar across the top at **18 px** (never under 16 px), up to 2 lines. One very long question was shortened.
- An **answer strip** sits right under it: ◀ left | ▲ middle | ▶ right, in the gate colours. Your current lane is outlined and marked **YOU**.
- **Labels on the gates** are bigger (15 px), outlined, kept between the HUD and the middle of the screen, and drawn above the 3D scene, so fog, darkness, water walls and sunsets can't hide them.
- **Reading time:** the question appears about 6 s ahead of the gate at any speed (it was capped at about 4 s at top speed), and the run eases off about 14% while a question is up. It never stops.
- **Calm window:** no obstacles spawn in the question window, anything already ahead is cleared, boss hazards pause, and roadside encounters wait. The boss bar, zone cards and small pop-ups are hidden while you read.
- **Feedback:** "✅ Correct!" or "💛 Not quite. It was …" in the same top bar, with the reference. In the strip the right answer turns gold and your wrong pick is crossed out. It all stays at the top, off the road.

**Other polish**
- All tap targets are now at least 44 px: sound/pause, the Bible map ✕, shop and creator tabs, skin-tone swatches, the creator "more" arrow and slim buttons.
- The sound button respects the right safe-area inset.
- On menus, toasts now show at the bottom (one used to cover the Bible book card's heading).
- The book card's "Enter the vision" button is near the top, not below seven verses.
- Boss texts (storm, flood) and the gate tutorial tip now explain the new behaviour.
- The camp no longer crashes if you reach it without a camp quest (a debug path).

**Tests (headless Chrome, 390×844 and 360×740)**
- `tests/noinput.js` runs with no input at all through 10 zones, 3 journey bosses, 5 road patterns (roofs, rails, launch ramp, jam, slide), 4 power-ups, 3 visions and their bosses, and the camp. It asserts the lane never changes and no jump or slide fires; only a launch ramp may lift you.
- `tests/fair.js` runs the whole journey and all 3 visions with no input. It found no spot where all three lanes were blocked by something you can't jump, slide or ramp over.
- `tests/qshots.js` takes before/after question screenshots in `screenshots3d/v11/`.
- `tests/taps.js` audits tap targets.
- `tests/hz.js` takes screenshots of the new storm/flood hazards.
