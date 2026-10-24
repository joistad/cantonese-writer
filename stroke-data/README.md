# Generated stroke data

Hanzi Writer data for Cantonese characters that are missing from
[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data): 167
characters at present.

Each `<char>.json` uses the standard Hanzi Writer format (`strokes`, `medians`,
optional `radStrokes`; 1024-unit box, y axis up) and is loaded as a fallback
when the official CDN returns 404:

    https://joistad.github.io/cantonese-writer/stroke-data/<encodeURIComponent(char)>.json

Nothing is drawn by hand. Every outline and median is cut out of characters
that are already in hanzi-writer-data and affine-transformed into place.

## Which characters

[`targets.tsv`](targets.tsv) lists the 159 missing characters that matter most
for Cantonese, ranked by a combined score:

| Signal | Source | What it catches |
|---|---|---|
| Frequency per million | `essay-cantonese.txt` from [rime-cantonese](https://github.com/rime/rime-cantonese) | Modern written Cantonese (but it is a pruned input-method list, so some characters are absent) |
| Corpus count | [HKCanCor](https://github.com/fcbond/hkcancor) via PyCantonese | Spoken Cantonese, 1990s transcription with its own spellings (𡃉 for 嘅, 嚹 for 喇) |
| Word entries | `jyut6ping3.words.dict.yaml` from rime-cantonese | Characters used in many Cantonese words even when rare in running text (踎 冧 揼 𠵱) |

Only characters with a combined score of at least 10 are targets. Characters
that are just a variant spelling of a character the dataset already has
(爲 → 為, 羣 → 群, 牀 → 床, found with OpenCC's Hong Kong and Taiwan
conversions) are excluded, because users type the Hong Kong form.

Of the 159 targets, 147 are generated, alongside the 20 hand-specified
characters (佢 喺 咗 啱 冇 啲 嚟 咁 哋 㗎 搵 諗 攰 嘥 嗰 喐 揾 冚 噉 嚿) that came
first.

## How they are made

### Hand-specified (20)

`SPECS` in `scripts/build-stroke-data.js`:

| Method | Characters | How |
|---|---|---|
| Radical + scaled component | 喺 咗 啱 啲 嚟 咁 哋 㗎 嘥 嗰 噉 嚿 喐 (口 from 唔), 佢 (亻 from 你), 諗 (訁 from 說) | Keep the donor's radical strokes; fit the whole component character into the slot right of the radical |
| Radical + lifted component | 搵, 揾 | 扌 from 提 + the right-hand part of 溫 / 温 with its 氵 removed |
| Stroke deletion | 冇 | 有 without the last two strokes |
| Component swap | 攰 (⿺支力) | 翅 (⿺支羽) with 羽 replaced by a scaled 力 |
| Top + bottom | 冚 (⿱冖山) | 冖 from 冗, 山 scaled into the space below |

### Automatic (147)

`scripts/plan-auto-specs.js` reads each target's decomposition from
[cjkvi-ids](https://github.com/cjkvi/cjkvi-ids) and picks donors from the
dataset. It writes `scripts/auto-specs.json`, which the build script uses
in the same way as the hand-written specs.

For a target ⿰XY (Y beside X) or ⿱XY (Y below X):

1. **First part:** a dataset character ⿰X? supplies X's strokes, in place.
   Among candidates it prefers one whose second part has a similar stroke
   count to Y, so X has a natural width.
2. **Second part:** a dataset character ⿰?Y supplies Y as it is already
   drawn in that position, so its proportions are designed for it. Only if
   none exists is the whole character Y scaled in instead.
3. **Mirror:** if no character has X in the first position (劏 ⿰當刂, 戙
   ⿰同戈), it keeps the second part from a donor and fits the whole of X
   into the first slot.
4. **Frames** (⿵ 門, ⿸ 疒 / 厂): the frame comes from a dataset character
   with the same frame (間, 痛) and the inner part goes into its hole.

The split between parts is found from stroke counts, since the first part is
written first, and each split is checked geometrically before it is used.
Stacked layouts cap any stretch at 1.5× in one direction relative to the
other. Side-by-side parts are not capped, since narrow left and right parts
are normal.

| Layout | Count |
|---|---|
| Side by side (⿰) | 127 |
| Stacked (⿱) | 9 |
| Frame (⿵ ⿸) | 6 |
| Mirror | 5 |

The first part is not always the radical (劏's radical is 刂), so automatic
characters omit `radStrokes`.

## Not covered

| Character | Reason |
|---|---|
| 乸, 屘 | ⿺ structure: stroke order varies, not safe to compose |
| 𢫏, 潁 | Nested decomposition |
| 𠻺, 搲, 𠸎, 𣲷, 𥹉 | A component is itself missing from the dataset (𠻺 needs 掗, which is now generated, so it could be built in a second pass) |
| 㷫, 覮, 糴 | Generated but rejected visually (see `REJECT` in the planner) |

Characters below the score cut-off aren't generated. They are mostly literary,
name or bird-name characters. Any character without data is still skipped
when words are added, and the skipped words are listed.

## Rebuilding

    npm i --no-save hanzi-writer-data
    node scripts/plan-auto-specs.js            # downloads ids.txt to scripts/.cache on first run
    node scripts/build-stroke-data.js          # all characters
    node scripts/build-stroke-data.js 喺 喎      # some

Output is deterministic. Rerunning without changes produces identical files.
To refresh `targets.tsv`, rerun the scoring against new corpus data. The
column definitions are in the file header.

Check results by serving the repo root (`python3 -m http.server`) and opening
`/scripts/preview.html?chars=喎攞嗱`. It shows each character next to a font
reference, with animate and quiz buttons.

## Quality

Every file was checked in two ways:

- **Visual:** each character was compared side by side with Noto Sans CJK HK.
- **Quiz:** a browser test drew every stroke along its median in Hanzi Writer
  3.5's quiz mode and checked it was accepted.

Results for the automatic set:

- **Good:** the large majority. Lifted components (step 2) look noticeably
  better than whole characters squeezed into a slot.
- **Thin but legible:** 鶲, 𠝹, 鎅, 褦, 𡃓. Dense parts are squeezed
  horizontally.

The hand-specified set is graded separately: 嚟 and 嚿 are passable (dense
right side), 冚 is passable (short 冖), the rest are good.

## Licence

The stroke data is derived from hanzi-writer-data, which comes from Make Me a
Hanzi and the Arphic PL KaitiM / UKai fonts. It is distributed under the same
terms: Arphic Public License and LGPL-3.0. See
[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) for the full
licence texts.

`targets.tsv` holds counts derived from
[rime-cantonese](https://github.com/rime/rime-cantonese) by CanCLID (CC BY 4.0)
and [HKCanCor](https://github.com/fcbond/hkcancor) (CC BY 4.0).
