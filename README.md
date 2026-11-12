# Hero Quest: Spoken English Junior games

A game for every lesson in the SEJ Live Batch curriculum, plus a builder for teachers.
Open `index.html` in Chrome to play. Nothing needs installing.

## What's inside

| | |
|---|---|
| Lessons | 24 from the curriculum sheet |
| Games | 72: 3 per lesson, each the same game type, questions and instruction as its Wordwall reference |
| Speaking prompts | Used in Class Battle's Speak round, from the slides' sentence patterns |
| Game types | 34: every Wordwall type, for creating new games in the admin panel |

### Game templates and their reference mechanics

| Template | Wordwall mechanic | How it plays |
|---|---|---|
| Sentence Train | Unjumble | Tap or drag words onto the train in order |
| Sort Party | Group sort | Tap or drag each card into a basket |
| Magic Letters | Anagram | Build the word from its letters |
| Listen & Spell | Spell the word | Hear the word, then spell it with extra letters in the pool |
| Missing Word | Complete the sentence | Choose the word that fills the gap |
| Match Makers | Match up | Tap or drag to connect pairs |
| Balloon Pop | Find the match | Pop the balloon that answers the clue |
| Pair or No Pair | Pair or no pair | Decide whether two things go together |
| Quick Check | True or false | Answer before the timer ends; labels can change (Formal/Informal) |
| Hero Quiz | Quiz, Gameshow quiz | Multiple choice; Quiz Show mode adds a timer and 50:50, x2 and +15 power-ups |
| Pop-Up Chicks | Whack-a-mole | Tap only the right phrases as they appear |
| Mystery Boxes | Open the box | Open a gift box and answer its question |
| Sky Pilot | Airplane | Fly into the cloud with the right answer |
| Hero Talk | (new) | Hear a prompt, then speak using a sentence starter |

## Admin panel

Select **Admin** on the map, or go to `#/admin`, and enter the admin PIN (1010, or `ADMIN_PIN` set in Vercel).

- Pick any lesson. **On the map** lists the games students play, in order: move them up or down, or take one off the map.
- **Default games** are the 3 games from the curriculum sheet. Edit one, undo the edit, or put it back on the map.
- **Create game** lists all 34 Wordwall game types, grouped by what they practise. Choose one and paste the content,
  one item per line. Each type shows how to write it and an example (**Use this example** fills it in). A live check says
  whether it is ready, then **Save** or **Save and play**.
- **Reset this lesson** brings back the 3 default games.

- **✨ Auto-format** (no AI) arranges pasted content into the chosen game's format: numbered lists, tables copied from Word or Excel, `question - answer` lines and multiple-choice blocks with `a) b) c)` and `Answer: b` all work. It runs by itself when you paste and when you save. It never writes new content; if a question has no wrong answers it borrows the other questions' answers and says so. End any line with `>> explanation` to show a reason on the answer slide and in the quick tips.
- **📑 Download slides** makes a PowerPoint in the SEJ template from the lesson's games (question, then answer ✅).
  **📄 Word file to slides** does the same for a `.docx`: headings become titles, lines ending in `?` become questions,
  `Answer:` and `Explanation:` lines become answer slides, and tables stay tables. No AI is used for slides.

### Batches, locks and the leaderboard

**👥 Batches** in the admin panel: create a batch to get its own link (`?batch=CODE`) and leaderboard.
Students open the link, enter their name and student ID, and play. Tap a lesson chip to lock or unlock it for that batch
(a new batch starts with lesson 1.1 unlocked). Only a student's **first try** at each game counts on the leaderboard;
later tries are practice. The server enforces this and refuses scores for locked lessons.

### Database and settings

Everything is stored in one Google Sheet, in tabs the app creates itself: `SEJ_Content` (admin game changes),
`SEJ_Batches`, `SEJ_Students` and `SEJ_Scores`. Set these in Vercel (Project → Settings → Environment Variables), then redeploy:

| Name | Value |
|---|---|
| `GOOGLE_SHEET_ID` | The ID from the sheet's address |
| `GOOGLE_CLIENT_EMAIL` | The service account's email |
| `GOOGLE_PRIVATE_KEY` | The service account's private key |
| `ADMIN_PIN` | Optional. Defaults to 1010 |

The sheet must be shared with the service account's email as **Editor**. Keep these values out of the code: `.env` is for
local use only and is ignored by git.

## Class Battle (teacher-led engagement)

Every lesson has one Class Battle for the live class. It plays on the class TV and the teacher runs it from a phone.

1. Open `?class=1.3` on the TV, or select **Class Battle** on the lesson page.
2. Scan the QR code with your phone, or open `?remote=` plus the code shown on the TV, then enter the teacher PIN. The server checks the PIN. It's `1010` unless `TEACHER_PIN` is set in Vercel.
3. Choose whole class or 2 to 5 teams, then start.

The rounds come from the lesson's own content, so Teacher Mode edits appear here too. Lessons take turns between games, so each lesson gets a different mix, and **More → Try a different game** swaps the current round for another game with the same kind of learning. Each lesson also has its own battle style (Score Battle, Race to the Finish, Fill the Star Jar or Tug of War for 2 teams) and a background that fits its topic. The teacher can change the style in step 3 of the setup or under More:

| Round | Game | Comes from |
|---|---|---|
| Warm-up | Word Flash, Hidden Picture, Listen & Choose, Memory Match, Word Rain, Missing Letters or Match Up | Power words (Bangla only where it's on the slides) or the lesson's matching game |
| Team Battle | Team Quiz, Riddle Time, Odd One Out, Group Sort, Complete the Sentence, Put It in Order (drag or tap the tiles) or True or False? | One of the lesson's games |
| Speak | Spin and Speak, Hot Potato, Mystery Boxes, Role-play or Speaking Cards | The speaking prompts |

The phone shows the answer before the class sees it. It also has reveal and next, the timer, 50:50, team points, a random student or team,
cheers, and restart and end. A game comes back with its scores if the TV page reloads within 4 hours.

### Student Play (optional)

The teacher turns on **🙋 Students play on phones**, on the TV before starting or on the phone at any time. A student QR appears on the TV.
Each student scans it, types a name, picks a team and answers on their own phone. At the reveal, each right answer gives one point to that student and to their team.
The teacher can still give or take points, and can remove a student from the panel, for example because of a rude name. A game holds up to 60 students.

- Word Flash, Team Quiz, Group Sort and Put It in Order are answered on the phone. In speaking rounds the phone shows the prompt, and the teacher gives the points.
- Students have their own code. It can't be turned into the teacher's code, and answers don't reach their phones until the reveal.
- The teacher's QR disappears once Student Play is on, so students can only scan their own. Teachers should scan theirs first.
- A bigger team can earn more points, so keep teams about the same size.

The TV only shows the game. Every control is on the teacher's phone after scanning and entering the PIN. Press F on a keyboard for full screen. To close the game, use **More → Close the game on the TV**.
1 to 5 = give a point, T = timer, R = random pick, C = QR code, M = controls, F = full screen. Everything except F and M needs the PIN first.

**How the phone link works:** `api/room.mjs` passes messages through Vercel's Runtime Cache, which needs no database or account setup. Rooms expire after 4 hours.
Team names and any student names the teacher adds pass through it, so use first names only. Class Battle needs the live site, because it's run from the
teacher's phone.

## Links worth sharing

- One game: `?game=1.3-2` opens Lesson 1.3's second game straight away, with no setup screen.
- One lesson: `?lesson=1.3`
- A Class Battle: `?class=1.3`
- Teacher and student phones use the QR codes on the TV, or `?remote=` and `?join=` plus the code.

## Changing content in code

Lessons live in `js/data.js`. Links from the curriculum sheet are in `js/links.js`. `CONTENT-NOTES.md` lists where the content differs from Wordwall.

## Checks

```
node tests/check-content.js                    # rules for all lessons and games
node tests/playthrough.js http://localhost:8123 shots   # plays every game; needs the playwright package
```

To run the second check, serve this folder first, for example with `python3 -m http.server 8123`.

Class Battle has its own check, which joins a real TV page and phone page through the relay:

```
npm install
node tests/dev-server.js 8124
node tests/classroom.js http://localhost:8124 shots
node tests/students.js http://localhost:8124 shots
node tests/types.js http://localhost:8124 shots      # all 34 game types and the admin flow
node tests/batches.js http://localhost:8124 shots    # batches, locks, leaderboard, slides
```

Adding `?test=1` to the address speeds games up and turns off the voice and microphone. It's for testing only.

## Browser support

- **Voice:** common lines play recorded clips from `assets/voice`, listed in `js/voice-index.js`, so they sound the same everywhere. Anything else, such as a sentence with a child's name or newly edited text, uses the device's built-in English voice.
- **Microphone:** needs Chrome or Edge, and a site on `https://` to work reliably. Elsewhere,
  children still get the "I said it!" button. What the microphone hears only changes the praise and never blocks progress.
- **Vibration:** Android phones only. iPhones and computers ignore it.

## Credits

Superhero art and the logo come from the SEJ lesson decks. Fonts: Lilita One, Fredoka and Baloo Da 2 (SIL Open Font License). Voice clips: made with the Kokoro model (Apache 2.0).

## Handouts (PDF)

In the admin panel, **🖨️ Handouts (PDF)** on a lesson (or **🖨️ Handouts** on one game) makes three things for students:

- **Flashcards**: power words and every question, 8 to a page, with the answer on the card or on the back for two-sided printing.
- **Quick tips**: the lesson goal, power words, tips written after `>>`, key facts from each game and speaking lines.
- **Practice sheet**: numbered questions with a name line, plus an answer key page.

Tick **Use my own content** to paste lines instead (`Question | Answer | wrong | wrong >> tip`). **Download PDF** saves a real PDF (Bangla and emoji included); **Print** sends the same pages to a printer. No AI is used.

## Database check

Admin → Batches → **🔧 Check the database** creates any missing tab in the Google Sheet, repairs header rows (data is never overwritten), freezes and styles the headers, writes a `SEJ_Guide` tab and shows row counts. The same check runs by itself when the server starts. From a terminal: `node tests/sheet-setup.mjs`.

Tests: `node tests/handouts.js` (handouts), `node tests/demo-real.js` (a full demo on the real sheet; needs `REAL_SHEET=1 node tests/dev-server.js 8125`).
