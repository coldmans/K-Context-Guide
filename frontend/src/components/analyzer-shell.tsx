"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WavRecorder, type RecordedAudio } from "@/lib/wav-recorder";

type Mode = "guide" | "menu" | "study" | "ad" | "podcast";

type AnalyzeResponse = {
  traceId: string;
  mode: Mode;
  summary: string;
  intent: string;
  answer: string;
  usefulPhrases: string[];
  cautions: string[];
  suggestedActions: string[];
  audioBase64: string | null;
  audioMimeType: string | null;
  usedFallback: boolean;
  fallbackReason: string | null;
  rawText: string;
};

const MODE_META: Record<Mode, { label: string; teaser: string; placeholder: string; samples: string[] }> = {
  guide: {
    label: "생활 가이드",
    teaser: "간판, 관광지, 영수증, 제품 설명",
    placeholder: "예: 여기 어디야? 외국인 친구한테 쉽게 설명해줘.",
    samples: [
      "이 사진 속 장소가 어디야?",
      "외국인 친구한테 쉽게 설명해줘.",
      "이거 한국에서 어떤 상황인지 알려줘.",
    ],
  },
  menu: {
    label: "메뉴판",
    teaser: "덜 매운 메뉴, 주문 팁, 식당 표현",
    placeholder: "예: 맵찔이인데 뭐 먹으면 좋아?",
    samples: [
      "맵찔이인데 뭐 먹으면 좋아?",
      "혼밥하기 무난한 메뉴 추천해줘.",
      "처음 먹는 사람에게 덜 자극적인 걸 골라줘.",
    ],
  },
  study: {
    label: "문제 풀이",
    teaser: "OCR + 단계별 설명",
    placeholder: "예: 이 문제를 단계별로 풀어줘.",
    samples: [
      "이 문제를 단계별로 풀어줘.",
      "조건부터 정리해서 설명해줘.",
      "중학생도 이해하게 쉽게 풀어줘.",
    ],
  },
  ad: {
    label: "광고 카피",
    teaser: "쇼호스트 톤, 제품 장점, 소개 멘트",
    placeholder: "예: 이 제품을 밝고 빠른 쇼호스트 말투로 소개해줘.",
    samples: [
      "이 제품을 쇼호스트처럼 소개해줘.",
      "30초 광고 멘트로 만들어줘.",
      "영문 카피도 같이 만들어줘.",
    ],
  },
  podcast: {
    label: "팟캐스트",
    teaser: "사진 기반 대본, 1분 오프닝, 대화체",
    placeholder: "예: 이 사진으로 1분짜리 팟캐스트 대본 만들어줘.",
    samples: [
      "이 사진으로 1분짜리 팟캐스트 대본 만들어줘.",
      "진행자 둘이 대화하듯이 써줘.",
      "따뜻한 분위기의 오프닝으로 시작해줘.",
    ],
  },
};

const INPUT_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/heic";

export function AnalyzerShell() {
  const recorderRef = useRef<WavRecorder | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<Mode>("menu");
  const [question, setQuestion] = useState(MODE_META.menu.samples[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [recording, setRecording] = useState(false);
  const [statusText, setStatusText] = useState("메뉴판, 관광지, 문제지 사진을 올리고 음성으로 질문해보세요.");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeMeta = MODE_META[mode];
  const resultAudioUrl = useMemo(() => {
    if (!result?.audioBase64 || !result.audioMimeType) {
      return null;
    }
    return `data:${result.audioMimeType};base64,${result.audioBase64}`;
  }, [result]);

  useEffect(() => {
    return () => {
      recorderRef.current?.dispose();
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (recordedAudio?.previewUrl) {
        URL.revokeObjectURL(recordedAudio.previewUrl);
      }
    };
  }, [imagePreviewUrl, recordedAudio]);

  const applySample = (sample: string) => {
    setQuestion(sample);
    setStatusText("샘플 질문을 적용했습니다. 이미지나 음성을 더하면 데모가 더 선명해집니다.");
  };

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setQuestion(MODE_META[nextMode].samples[0]);
    setResult(null);
    setError(null);
    setStatusText(`${MODE_META[nextMode].label} 모드로 전환했습니다.`);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    setResult(null);
    if (!file) {
      setImagePreviewUrl(null);
      return;
    }
    setImagePreviewUrl(URL.createObjectURL(file));
    setStatusText(`${file.name} 이미지를 준비했습니다.`);
  };

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      recorderRef.current?.dispose();
      const recorder = new WavRecorder();
      recorderRef.current = recorder;
      await recorder.start();
      setRecording(true);
      setStatusText("녹음 중입니다. 질문을 자연스럽게 말한 뒤 녹음을 멈춰주세요.");
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "녹음을 시작할 수 없습니다.");
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) {
      return;
    }

    try {
      const audio = await recorderRef.current.stop();
      setRecordedAudio((previous) => {
        if (previous?.previewUrl) {
          URL.revokeObjectURL(previous.previewUrl);
        }
        return audio;
      });
      setRecording(false);
      setStatusText(`${audio.durationLabel} 길이의 질문 음성을 준비했습니다.`);
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "녹음을 저장할 수 없습니다.");
      setRecording(false);
    }
  };

  const resetInputs = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    if (recordedAudio?.previewUrl) {
      URL.revokeObjectURL(recordedAudio.previewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
    setRecordedAudio(null);
    setResult(null);
    setError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setStatusText("입력을 초기화했습니다.");
  };

  const submit = async () => {
    if (!imageFile && !recordedAudio && !question.trim()) {
      setError("이미지, 음성, 텍스트 질문 중 하나는 넣어주세요.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setStatusText("카나나가 이미지와 질문을 함께 해석하고 있습니다.");

      const formData = new FormData();
      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (recordedAudio) {
        formData.append("audio", recordedAudio.blob, recordedAudio.fileName);
      }
      formData.append("question", question.trim());
      formData.append("mode", mode);

      const response = await fetch("/backend/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "분석 요청이 실패했습니다.");
      }

      const payload = (await response.json()) as AnalyzeResponse;
      setResult(payload);
      setStatusText(payload.usedFallback ? "데모 fallback 응답을 표시했습니다." : "카나나 응답을 불러왔습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "분석 요청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-[560px] border border-white/14 bg-[linear-gradient(180deg,rgba(14,20,28,0.88),rgba(10,14,20,0.94))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Live Demo Console</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white">사진과 목소리로 묻기</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">{modeMeta.teaser}</p>
        </div>
        <button
          type="button"
          onClick={resetInputs}
          className="rounded-full border border-white/14 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Reset
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(MODE_META) as Mode[]).map((item) => {
          const active = item === mode;
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleModeChange(item)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--ink)]"
                  : "border-white/14 text-white/74 hover:border-white/30 hover:text-white"
              }`}
            >
              {MODE_META[item].label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="border border-dashed border-white/18 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand)]">Image</p>
            <div className="mt-4 flex min-h-[260px] items-center justify-center overflow-hidden border border-white/10 bg-black/20">
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="사용자 업로드 미리보기" className="h-full min-h-[260px] w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm leading-6 text-white/56">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/14 text-xl">⌁</div>
                  <p>메뉴판, 관광지, 문제지, 제품 사진을 올려보세요.</p>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--sand)]">
                사진 올리기
                <input ref={imageInputRef} type="file" accept={INPUT_ACCEPT} className="sr-only" onChange={handleImageChange} />
              </label>
              <span className="text-xs leading-5 text-white/52">권장: JPG, PNG, WEBP</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-white/10 bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand)]">Voice</p>
              <span className="text-xs text-white/48">WAV recording</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:brightness-110"
                >
                  음성 녹음 시작
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-full bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:brightness-110"
                >
                  녹음 멈추기
                </button>
              )}
              <p className="text-sm leading-6 text-white/62">
                질문을 자연스럽게 말하면 브라우저에서 WAV로 저장해 백엔드로 전달합니다.
              </p>
            </div>
            {recordedAudio ? (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs text-white/50">{recordedAudio.durationLabel}</p>
                <audio controls className="mt-2 w-full" src={recordedAudio.previewUrl} />
              </div>
            ) : null}
          </div>

          <div className="border border-white/10 bg-white/4 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand)]">Question</p>
              <span className="text-xs text-white/48">Text fallback supported</span>
            </div>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={modeMeta.placeholder}
              rows={5}
              className="mt-4 w-full resize-none border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-[var(--accent)]"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {modeMeta.samples.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => applySample(sample)}
                  className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 transition hover:border-white/30 hover:text-white"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="text-sm leading-6 text-white/60">{statusText}</p>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "분석 중..." : "카나나로 분석하기"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 space-y-5 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Analysis Result</p>
            {result.usedFallback ? (
              <span className="rounded-full border border-amber-300/40 bg-amber-400/12 px-3 py-1 text-xs text-amber-100">
                Demo fallback
              </span>
            ) : (
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                Kanana live
              </span>
            )}
            <span className="text-xs text-white/38">trace {result.traceId.slice(0, 8)}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock title="이미지에서 인식한 내용" content={result.summary} />
            <InfoBlock title="사용자 의도" content={result.intent} />
          </div>

          <div className="border border-white/10 bg-white/4 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand)]">카나나 답변</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/84">{result.answer}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ListBlock title="바로 쓸 수 있는 표현" items={result.usefulPhrases} emptyText="표현이 없으면 카나나가 답변 본문에 자연스럽게 섞어 설명합니다." />
            <ListBlock title="주의할 점" items={result.cautions} emptyText="추가 주의사항이 없을 때는 이 영역이 비워집니다." />
          </div>

          <div className="border border-white/10 bg-black/18 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand)]">추가 액션</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.suggestedActions.map((action) => (
                    <span key={action} className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/72">
                      {action}
                    </span>
                  ))}
                </div>
              </div>
              {resultAudioUrl ? <audio controls className="w-full max-w-[280px]" src={resultAudioUrl} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="border border-white/10 bg-white/4 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand)]">{title}</p>
      <p className="mt-4 text-sm leading-7 text-white/78">{content}</p>
    </div>
  );
}

function ListBlock({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="border border-white/10 bg-white/4 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand)]">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3 text-sm leading-7 text-white/78">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-soft)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-7 text-white/56">{emptyText}</p>
      )}
    </div>
  );
}
