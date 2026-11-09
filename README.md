# Hero Quest: Spoken English Junior games

A game for every lesson in the SEJ Live Batch curriculum, plus a builder for teachers.
Open `index.html` in Chrome to play. Nothing needs installing.

## What's inside

| | |
|---|---|
| Lessons | 24 from the curriculum sheet |
| Games | 72: 3 per lesson, using the questions from each Wordwall link |
| Speaking rounds | 24: one per lesson, built from the slides' sentence patterns |
| Templates | 14, listed below |

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

## Teacher Mode (the builder)

Select 🛠️ on the map, or go to `index.html#/teacher`.

- Edit, reorder, delete or test any game, or add a new one from a template.
- Each template uses one simple line format, shown beside the editor, and mistakes are flagged as you type.
- Open the lesson's slides, lesson plan and reference games from the same page.

**Edits save only in the browser where they were made.** To share them with everyone, select
**Publish file** and replace `js/custom-content.js` with the downloaded file.

## Links worth sharing

- One game: `?game=1.3-2` opens Lesson 1.3's second game straight away, with no setup screen.
- A speaking round: `?game=1.3-talk`
- One lesson: `?lesson=1.3`

## Changing content in code

Lessons live in `js/data.js`. Links from the curriculum sheet are in `js/links.js`. `CONTENT-NOTES.md` lists where the content differs from Wordwall.

## Checks

```
node tests/check-content.js                    # rules for all lessons and games
node tests/playthrough.js http://localhost:8123 shots   # plays every game; needs the playwright package
```

To run the second check, serve this folder first, for example with `python3 -m http.server 8123`.
Adding `?test=1` to the address speeds games up and turns off the voice and microphone. It's for testing only.

## Browser support

- **Voice:** uses the device's built-in English voice, so it sounds different from device to device.
- **Microphone:** needs Chrome or Edge, and a site on `https://` to work reliably. Elsewhere,
  children still get the "I said it!" button. What the microphone hears only changes the praise and never blocks progress.
- **Vibration:** Android phones only. iPhones and computers ignore it.

## Credits

Superhero art and the logo come from the SEJ lesson decks. Fonts: Lilita One, Fredoka and Baloo Da 2 (SIL Open Font License).
