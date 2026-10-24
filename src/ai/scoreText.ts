import type { DrumId, InstrumentId, Song } from "@/core/types";
import { compareNotes, isAccidental } from "@/core/utils";
import { detectDiscoveries } from "@/discovery/detector";
import type { DiscoveryId } from "@/discovery/types";
import { noteLabel } from "@/ui/noteLabel";

// A song written out as text for a language model to "listen" to (#151). The
// app holds the score as data, so the model reads notes, not audio.
//
// What goes in is only the music: a Song carries no title, author or note, and
// that is deliberate — a title can name a classmate, and none of it is needed
// to hear the piece.

const INSTRUMENT_NAMES: Record<InstrumentId, string> = {
  piano: "ピアノ",
  "8bit": "ピコピコ音（8bit）",
  synth: "シンセ",
  marimba: "マリンバ",
  flute: "フルート",
};

const DRUM_NAMES: Record<DrumId, string> = {
  kick: "キック",
  snare: "スネア",
  hihat: "ハイハット",
};

// Only the shapes that held up against a null model. Shuffling a song's notes
// produces the harmony matches (fifths, thirds, semitone clashes) just as often
// as the real song does, so passing those along would hand the model a
// "finding" that says nothing about this piece.
const GROUNDED_SHAPES: Partial<Record<DiscoveryId, string>> = {
  call_and_response: "よびかけと こたえ",
  stepwise_run: "となりの音へ じゅんに うごく ところ",
  rhythm_loop: "おなじ リズムの くりかえし",
};

// Enough to say where a shape is without the list outgrowing the score.
const MAX_PLACES_PER_SHAPE = 3;

const label = (note: string) => noteLabel(note, "ja");

function beatRange(fromBeat: number, toBeat: number): string {
  return fromBeat === toBeat ? `${fromBeat}拍目` : `${fromBeat}〜${toBeat}拍目`;
}

function groundedShapes(song: Song): string[] {
  const beatOf = (step: number) => Math.floor(step / song.stepsPerBeat) + 1;
  const places = new Map<DiscoveryId, string[]>();
  for (const match of detectDiscoveries(song)) {
    if (!GROUNDED_SHAPES[match.cardId]) continue;
    const place = beatRange(beatOf(match.startStep), beatOf(match.triggerStep));
    const list = places.get(match.cardId) ?? [];
    if (!list.includes(place) && list.length < MAX_PLACES_PER_SHAPE) list.push(place);
    places.set(match.cardId, list);
  }
  return [...places].map(([id, list]) => `${GROUNDED_SHAPES[id]}（${list.join("、")}）`);
}

export function scoreToText(song: Song): string {
  const perBeat = song.stepsPerBeat;
  const notes = [...song.melody.notes].sort(
    (a, b) => a.startStep - b.startStep || compareNotes(a.note, b.note)
  );
  const hits = [...song.drums.hits].sort((a, b) => a.step - b.step);

  const lines: string[] = [
    `テンポ: ${song.bpm}（1分間に ${song.bpm}拍）`,
    `楽器: ${INSTRUMENT_NAMES[song.instrument] ?? song.instrument}`,
    `長さ: ${song.blocks}拍（1拍 = ${perBeat}マス）`,
  ];

  if (notes.length === 0) {
    lines.push("メロディ: なし");
  } else {
    const byPitch = [...notes].sort((a, b) => compareNotes(a.note, b.note));
    lines.push(
      `メロディの音の数: ${notes.length} / いちばん低い音: ${label(byPitch[0].note)}` +
        ` / いちばん高い音: ${label(byPitch[byPitch.length - 1].note)}` +
        ` / 黒鍵の音: ${notes.some((n) => isAccidental(n.note)) ? "あり" : "なし"}`
    );
  }
  lines.push(`ドラム: ${hits.length === 0 ? "なし" : `${hits.length}回`}`);

  const shapes = groundedShapes(song);
  lines.push(`見つかった形: ${shapes.length > 0 ? shapes.join(" / ") : "なし"}`);

  lines.push(
    "",
    "楽譜（[3]ソ4×2 ＝ その拍の 3マス目から ソ4 を 2マスぶん。" +
      "「+」で つないだ音は いっしょに、「→」で つないだ音は じゅんばんに 鳴る）"
  );

  // One row per beat first, then runs of identical quiet rows fold into one line.
  //
  // A beat with nothing starting in it is not necessarily silent: a long note
  // from an earlier beat can still be sounding. Calling that a rest would tell
  // the model the opposite of what a listener hears, so the two are kept apart.
  const rows: { beat: number; text: string; quiet: boolean }[] = [];
  for (let beat = 1; beat <= song.blocks; beat++) {
    const from = (beat - 1) * perBeat;
    const to = from + perBeat;
    const starting = notes.filter((n) => n.startStep >= from && n.startStep < to);
    const drums = hits.filter((h) => h.step >= from && h.step < to);

    if (starting.length === 0 && drums.length === 0) {
      const sounding = notes.some((n) => n.startStep < from && n.startStep + n.durationSteps > from);
      rows.push({ beat, text: sounding ? "（前の音が つづく）" : "（休み）", quiet: true });
      continue;
    }

    // Notes starting together are joined with "+", moments in order with "→".
    // Listing them side by side ("[1]ミ5×1 [4]ソ5×1") read as a chord: the model
    // called notes three cells apart "sounding together", and a legend saying
    // otherwise didn't stop it. The notation now says it.
    const moments = new Map<number, string[]>();
    for (const n of starting) {
      const at = n.startStep - from + 1;
      moments.set(at, [...(moments.get(at) ?? []), `${label(n.note)}×${n.durationSteps}`]);
    }
    const melody = [...moments].map(([at, group]) => `[${at}]${group.join("+")}`).join(" → ");
    const parts = melody ? [melody] : [];
    // A beat with new notes can still have older ones sounding under them. Left
    // out, the line reads as if only the new notes play: the model once said a
    // beat had "only the low ド" while a long ソ4 was still ringing over it.
    const held = notes.filter((n) => n.startStep < from && n.startStep + n.durationSteps > from);
    if (held.length > 0) {
      parts.push(`（${held.map((n) => label(n.note)).join("・")} が つづく）`);
    }
    if (drums.length > 0) {
      const drumText = drums.map((h) => `[${h.step - from + 1}]${DRUM_NAMES[h.drumId]}`).join(" ");
      parts.push(`${parts.length > 0 ? "／ " : ""}ドラム ${drumText}`);
    }
    rows.push({ beat, text: parts.join(" "), quiet: false });
  }

  for (let i = 0; i < rows.length; ) {
    let end = i;
    while (
      rows[i].quiet &&
      end + 1 < rows.length &&
      rows[end + 1].quiet &&
      rows[end + 1].text === rows[i].text
    ) {
      end++;
    }
    lines.push(`${beatRange(rows[i].beat, rows[end].beat)}: ${rows[i].text}`);
    i = end + 1;
  }

  return lines.join("\n");
}
