# 寫粵字 Cantonese Xiehanzi

A Cantonese adaptation of [Xiehanzi](https://github.com/krmanik/Anki-xiehanzi) — a web app that generates Anki decks for practising Chinese character writing, adapted for **Cantonese** with Jyutping romanisation and Cantonese text-to-speech.

**Live app:** https://joistad.github.io/cantonese-xiehanzi/

---

## What it does

- Look up Cantonese vocabulary from a built-in dictionary (CC-CEDICT + CantoJpMin)
- See Traditional Chinese characters with **Jyutping** romanisation and English definitions
- Export an Anki `.apkg` deck using the **Anki-xiehanzi** note type
- Cards include a **HanziWriter stroke-order practice field** — draw the character on screen and get it graded stroke by stroke
- Optional **Cantonese audio** (Hong Kong neural voice via Edge TTS)
- Tone colours follow the 6-tone Cantonese system

---

## How to use

1. Open the [live app](https://joistad.github.io/cantonese-xiehanzi/)
2. Search for a Cantonese word or character
3. Add words to your deck
4. Configure card options (Writing Component, Audio, Front side fields)
5. Click **Generate Deck** — downloads a `.apkg` file
6. Import the file into Anki

The cards use the `Cantonese-xiehanzi` note type (based on `Basic - (Anki-xiehanzi)`). If you already use the original Xiehanzi note type, the layout and functionality will be familiar.

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

HanziWriter stroke data comes from [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), which covers ~9,500 characters from Standard Chinese. A small number of **exclusively written-Cantonese characters** (e.g. 佢, 喺, 嘅, 咗) are not in that dataset and will not show a stroke-order practice field. All other characters work normally.

---

## Tech stack

- Vanilla JS / HTML / CSS — no build step, runs entirely in the browser
- [genanki-js](https://github.com/krmanik/genanki-js) for `.apkg` generation
- [HanziWriter](https://hanziwriter.org/) for stroke-order animation and quiz
- [CantoJpMin](https://github.com/hanleyweng/CantoJpMin) for Jyutping lookup
- [CC-CEDICT](https://cc-cedict.org/) as the base dictionary
- [edge-tts-universal](https://github.com/nicholasgasior/edge-tts-universal) for Cantonese TTS (zh-HK-HiuGaaiNeural)
- [Anki Persistence](https://github.com/SimonLammer/anki-persistence) embedded in card templates

---

## Credits

This project is a Cantonese adaptation of **[Anki-xiehanzi](https://github.com/krmanik/Anki-xiehanzi)** by [@krmanik](https://github.com/krmanik). Card templates, note type structure, and core `.apkg` generation logic are derived from that project.

Jyutping data from **[CantoJpMin](https://github.com/hanleyweng/CantoJpMin)** by [@hanleyweng](https://github.com/hanleyweng).

---

## License

Card template data is derived from Xiehanzi (MIT) and hanzi-writer-data (Arphic Public License).  
Dictionary data from CC-CEDICT (Creative Commons Attribution-Share Alike 3.0).
