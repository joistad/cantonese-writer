# Generated stroke data

Hanzi Writer data for common Cantonese characters that are missing from
[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data).

Each `<char>.json` uses the standard Hanzi Writer format (`strokes`, `medians`,
`radStrokes`; 1024-unit box, y axis up) and is loaded as a fallback when the
official CDN returns 404:

    https://joistad.github.io/cantonese-writer/stroke-data/<encodeURIComponent(char)>.json

## How they are made

`scripts/build-stroke-data.js` composes each character from strokes that already
exist in hanzi-writer-data. Nothing is drawn by hand. Structures were checked
against [cjkvi-ids](https://github.com/cjkvi/cjkvi-ids).

| Method | Characters | How |
|---|---|---|
| Radical + scaled component | 喺 咗 啱 啲 嚟 咁 哋 㗎 嘥 嗰 噉 嚿 喐 (口 from 唔), 佢 (亻 from 你), 諗 (訁 from 說) | Keep the donor's radical strokes; fit the whole component character into the slot right of the radical |
| Radical + lifted component | 搵, 揾 | 扌 from 提 + the right-hand part of 溫 / 温 with its 氵 removed |
| Stroke deletion | 冇 | 有 without the last two strokes |
| Component swap | 攰 (⿺支力) | 翅 (⿺支羽) with 羽 replaced by a scaled 力 |
| Top + bottom | 冚 (⿱冖山) | 冖 from 冗, 山 scaled into the space below |

Radical strokes always come first. Medians are transformed with the outlines, so
the quiz grades them like any other character.

To rebuild (after editing `SPECS` / `OVERRIDES` in the script):

    npm i --no-save hanzi-writer-data   # optional; otherwise fetched from jsDelivr
    node scripts/build-stroke-data.js          # all
    node scripts/build-stroke-data.js 喺 咗     # some

Check the result by serving the repo root (`python3 -m http.server`) and opening
`/scripts/preview.html`, which shows each character next to a font reference
with animate and quiz buttons.

## Quality

Checked visually and by tracing every median in quiz mode (all strokes accepted,
no misses, for all 20).

- **Good:** 佢 喺 咗 啱 冇 啲 咁 哋 㗎 搵 揾 諗 攰 嗰 噉 喐 嘥
- **Passable:** 嚟 and 嚿 (dense right side squeezed into a narrow slot; legible but thin), 冚 (冗's 冖 is a short cover, so it reads as 冖 over 山 rather than the boxed shape most fonts use)

Generated components are proportionally narrower than in hand-designed fonts,
since a full character is squeezed into the right-hand slot.

## Licence

Derived from hanzi-writer-data, which is derived from Make Me a Hanzi and the
Arphic PL KaitiM / UKai fonts. Distributed under the same terms: Arphic Public
License and LGPL-3.0. See
[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) for the full
licence texts.
