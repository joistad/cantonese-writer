# Cantonese Writer

Create Anki flashcard decks for learning Cantonese — stroke-order writing practice, Jyutping, Traditional characters, and native TTS audio.

A Cantonese adaptation of [Anki-xiehanzi](https://github.com/krmanik/Anki-xiehanzi).

**Live app:** https://joistad.github.io/cantonese-writer/

---

## What it does

- Look up Cantonese vocabulary from a built-in dictionary (CC-CEDICT + CantoJpMin)
- See Traditional Chinese characters with **Jyutping** romanisation and English definitions
- Export an Anki `.apkg` deck using the **Cantonese Writer** note type
- Cards include a **HanziWriter stroke-order practice field** — draw the character on screen and get it graded stroke by stroke
- Optional **Cantonese audio** via Google Cloud TTS (Hong Kong yue-HK voice — genuine Cantonese, not Mandarin)
- Tone colours follow the 6-tone Cantonese system

---

## How to use

1. Open the [live app](https://joistad.github.io/cantonese-writer/)
2. Configure your deck (card layout, audio settings)
3. Add the characters you want to learn
4. Click **Generate Deck** — downloads a `.apkg` file
5. Import the file into Anki

---

## Card fields

| Field | Content |
|---|---|
| Simplified | Traditional Cantonese character(s) |
| Traditional | Same as Simplified |
| Pinyin | Jyutping romanisation |
| Zhuyin | *(empty)* |
| Definitions | English definitions with tone-coloured Jyutping |
| Audio | `[sound:yue-word.mp3]` if audio was generated |

---

## Notes on character coverage

HanziWriter stroke data comes from [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), which covers ~9,500 characters from Standard Chinese. Characters exclusive to written Cantonese are generally absent from this dataset — these show a graceful fallback message instead of a blank writing field. All other characters work normally.

**Known unsupported characters** (stroke data unavailable):

| Character | Jyutping | Meaning |
|---|---|---|
| 佢 | keoi5 | he / she / it |
| 喺 | hai2 | to be at / to be in |
| 嘅 | ge3 | possessive / sentence particle |
| 咗 | zo2 | completed action particle (past tense) |
| 啱 | ngaam1 | correct / just now |
| 冇 | mou5 | to not have / there is no |
| 啲 | di1 | some / a little / plural marker |
| 唔 | m4 | not (negation) |
| 係 | hai6 | to be (copula) |

---

## Tech stack

- Vanilla JS / HTML / CSS — no build step, runs entirely in the browser
- [genanki-js](https://github.com/krmanik/genanki-js) for `.apkg` generation
- [HanziWriter](https://hanziwriter.org/) for stroke-order animation and quiz
- [CantoJpMin](https://github.com/hanleyweng/CantoJpMin) for Jyutping lookup
- [CC-CEDICT](https://cc-cedict.org/) as the base dictionary
- Google Cloud TTS (yue-HK-Standard-A) for Cantonese audio
- [Anki Persistence](https://github.com/SimonLammer/anki-persistence) embedded in card templates

---

## Credits

This project is a Cantonese adaptation of **[Anki-xiehanzi](https://github.com/krmanik/Anki-xiehanzi)** by [@krmanik](https://github.com/krmanik). Card templates, note type structure, and core `.apkg` generation logic are derived from that project.

Jyutping data from **[CantoJpMin](https://github.com/hanleyweng/CantoJpMin)** by [@hanleyweng](https://github.com/hanleyweng).

---

## License

Card template data is derived from Xiehanzi (MIT) and hanzi-writer-data (Arphic Public License).  
Dictionary data from CC-CEDICT (Creative Commons Attribution-Share Alike 3.0).
