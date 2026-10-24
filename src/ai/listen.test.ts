import { describe, expect, it } from "vitest";
import {
  keepSafeImpressions,
  LISTEN_IMPRESSIONS,
  LISTEN_MAX_BECAUSE,
  LISTEN_MAX_SCENE,
  LISTEN_SYSTEM_PROMPT,
  listenUserMessage,
} from "./listen";

const ok = { scene: "よるの まちに しずかに ふる あめ", because: "ひくい ドが ゆっくり つづくから" };

describe("keepSafeImpressions", () => {
  it("keeps a plain impression, trimmed", () => {
    expect(keepSafeImpressions([{ scene: `  ${ok.scene} `, because: ok.because }])).toEqual([ok]);
  });

  it("drops verdicts, whatever the script", () => {
    for (const scene of ["とても上手な あめ", "ジョウズに できた", "ここは まちがい", "へたな ところ"]) {
      expect(keepSafeImpressions([{ scene, because: ok.because }])).toEqual([]);
    }
  });

  it("drops instructions to change or fix the notes", () => {
    for (const because of [
      "さいごの 音を かえると いいよ",
      "ここの 音を なおして みよう",
      "ソを 変えて みて",
      "もっと はやく した ほうが いい",
    ]) {
      expect(keepSafeImpressions([{ scene: ok.scene, because }])).toEqual([]);
    }
  });

  it("keeps ordinary scenes that merely contain those sounds", () => {
    // カエルと / むかえて / なかよくなる: kana that a bare-verb list would catch.
    const scenes = ["カエルと あめの いけ", "あさを むかえて とりが なく", "どうぶつが なかよくなる"];
    const kept = keepSafeImpressions(scenes.map((scene) => ({ scene, because: ok.because })));
    expect(kept.map((i) => i.scene)).toEqual(scenes);
  });

  it("drops blocked and sensitive words, as for titles", () => {
    expect(keepSafeImpressions([{ scene: "しね", because: ok.because }])).toEqual([]);
    expect(keepSafeImpressions([{ scene: "おならの おと", because: ok.because }])).toEqual([]);
  });

  it("drops an impression that is too long or missing a part — whole, never trimmed", () => {
    expect(keepSafeImpressions([{ scene: "あ".repeat(LISTEN_MAX_SCENE + 1), because: ok.because }])).toEqual([]);
    expect(keepSafeImpressions([{ scene: ok.scene, because: "あ".repeat(LISTEN_MAX_BECAUSE + 1) }])).toEqual([]);
    expect(keepSafeImpressions([{ scene: ok.scene, because: "  " }])).toEqual([]);
  });

  it("keeps the rest when one impression is dropped, up to the limit", () => {
    const items = [
      { scene: "とても上手", because: ok.because },
      ...Array.from({ length: LISTEN_IMPRESSIONS + 1 }, (_, i) => ({ scene: `あめ ${i}`, because: ok.because })),
    ];
    const kept = keepSafeImpressions(items);
    expect(kept).toHaveLength(LISTEN_IMPRESSIONS);
    expect(kept[0].scene).toBe("あめ 0");
  });
});

describe("prompt", () => {
  it("states the limits the filter enforces, so the two can't drift", () => {
    expect(LISTEN_SYSTEM_PROMPT).toContain(`${LISTEN_IMPRESSIONS}つ`);
    expect(LISTEN_SYSTEM_PROMPT).toContain(`${LISTEN_MAX_SCENE}文字以内`);
    expect(LISTEN_SYSTEM_PROMPT).toContain(`${LISTEN_MAX_BECAUSE}文字以内`);
  });

  it("hands the score over inside its own tags", () => {
    expect(listenUserMessage("テンポ: 100")).toContain("<score>\nテンポ: 100\n</score>");
  });
});
