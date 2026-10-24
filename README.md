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

HanziWriter stroke data comes from [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), which covers ~9,500 characters from Standard Chinese. Characters exclusive to written Cantonese are mostly absent from it.

For the most common of these, Cantonese Writer ships **generated stroke data** in [`stroke-data/`](stroke-data/). Each file is composed from existing hanzi-writer-data strokes (e.g. 喺 = the 口 of 唔 + a scaled 係); nothing is hand-drawn. The app and the card template use the official dataset first and fall back to these files. See [`stroke-data/README.md`](stroke-data/README.md) for the method.

**Covered by generated data:** 167 characters, including the most common Cantonese ones (佢 喺 咗 啱 冇 啲 嚟 咁 哋 㗎 搵 諗 嗰 噉 喎 攞 嗱 黐 啩 抌 孖 餸 冧 踎 揼 劏 𨋢 嚡 …). The full ranked list is in [`stroke-data/targets.tsv`](stroke-data/targets.tsv), and what is and isn't covered is in [`stroke-data/README.md`](stroke-data/README.md).

嘅, 唔 and 係 were listed as unsupported in earlier versions of this README, but they have always been in the official dataset.

Any other character without stroke data is skipped when you add words, and the skipped words are listed so you know.

**Existing decks:** the fallback lives in the card template, which Anki stores with the note type when you first import a deck. Decks imported before this change keep the old template. To get the fallback, either generate and import a new deck, or copy the updated card template into Anki (Tools → Manage Note Types → Cantonese-xiehanzi → Cards).

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
Generated stroke data in `stroke-data/` is derived from hanzi-writer-data and distributed under the same terms (Arphic Public License / LGPL-3.0).  
Dictionary data from CC-CEDICT (Creative Commons Attribution-Share Alike 3.0).
