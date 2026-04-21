import { AnalyzerShell } from "@/components/analyzer-shell";

const scenarios = [
  {
    title: "메뉴판 도우미",
    prompt: "맵찔이인데 뭐 먹으면 좋아?",
    detail: "메뉴판 사진을 읽고 한국식 매운맛 표현까지 반영해 실패 확률이 낮은 메뉴를 골라줍니다.",
  },
  {
    title: "관광지 음성 가이드",
    prompt: "여기 어디고, 친구한테 어떻게 설명해?",
    detail: "장소 추정, 한국 문화 맥락, 외국인에게 설명하기 쉬운 문장까지 한 번에 정리합니다.",
  },
  {
    title: "문제지 풀이",
    prompt: "이 문제 단계별로 풀어줘.",
    detail: "OCR 기반으로 문제를 읽고 조건 정리부터 풀이 과정까지 차근차근 안내합니다.",
  },
];

const principles = [
  "이미지 + 음성 + 텍스트를 한 번에 이해하는 멀티모달 흐름",
  "한국어 발화와 한국 생활 맥락을 전면에 둔 답변 설계",
  "홈서버에 바로 올릴 수 있는 프론트/백엔드 분리 구조",
];

const deploymentSteps = [
  "브라우저가 이미지와 녹음 음성을 업로드합니다.",
  "Next.js 프론트가 같은 도메인 경로로 Spring Boot API에 전달합니다.",
  "Spring Boot가 카나나 스트리밍 응답을 받아 텍스트와 WAV 오디오로 정리합니다.",
  "결과 카드와 음성 플레이어를 웹에서 바로 재생합니다.",
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-8rem] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,_rgba(255,151,70,0.36),_transparent_62%)] blur-3xl" />
        <div className="absolute right-[-8rem] top-[8rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(69,180,165,0.26),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[18%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(250,214,132,0.22),_transparent_60%)] blur-3xl" />
        <div className="grain absolute inset-0" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 pb-14 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-4 text-sm tracking-[0.2em] text-white/68 uppercase">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
            NoonchiBot / K-Context Guide
          </div>
          <div className="hidden gap-6 md:flex">
            <span>Kanana-ready</span>
            <span>Home Server Friendly</span>
            <span>Multimodal Demo</span>
          </div>
        </header>

        <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
          <section className="flex max-w-[720px] flex-col justify-center">
            <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.28em] text-[var(--accent-soft)]">
              사진과 목소리만으로 이해하는 한국 생활 AI 가이드
            </p>
            <h1 className="animate-fade-up mt-4 text-[clamp(3.2rem,8vw,7rem)] font-extrabold leading-[0.92] tracking-[-0.06em] text-white [animation-delay:120ms]">
              눈치 있게 읽고
              <br />
              바로 말해주는
              <br />
              <span className="font-[var(--font-display)] font-semibold italic tracking-[-0.03em] text-[var(--sand)]">
                K-Context Guide
              </span>
            </h1>
            <p className="animate-fade-up mt-6 max-w-2xl text-lg leading-8 text-white/78 [animation-delay:240ms]">
              메뉴판, 관광지, 간판, 문제지처럼 한국 생활에서 자주 마주치는 장면을 카나나가 이미지와 음성으로 이해하고,
              한국어 맥락에 맞는 텍스트와 자연스러운 음성으로 답해줍니다.
            </p>

            <div className="animate-fade-up mt-10 grid gap-6 border-y border-white/10 py-6 text-sm text-white/74 md:grid-cols-3 [animation-delay:360ms]">
              {principles.map((item) => (
                <div key={item} className="space-y-2">
                  <p className="text-[var(--sand)]">Point</p>
                  <p className="leading-6">{item}</p>
                </div>
              ))}
            </div>

            <div className="animate-fade-up mt-10 grid gap-5 md:grid-cols-3 [animation-delay:480ms]">
              {scenarios.map((scenario) => (
                <article key={scenario.title} className="border border-white/12 bg-white/4 p-5 backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1 hover:border-[var(--accent)]/50">
                  <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-soft)]">Scenario</p>
                  <h2 className="mt-3 text-2xl font-bold text-white">{scenario.title}</h2>
                  <p className="mt-4 text-sm text-[var(--sand)]">{scenario.prompt}</p>
                  <p className="mt-4 text-sm leading-6 text-white/72">{scenario.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="animate-fade-up lg:justify-self-end [animation-delay:260ms]">
            <AnalyzerShell />
          </aside>
        </div>
      </section>

      <section className="relative border-t border-white/10 bg-black/18 py-16">
        <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[var(--accent-soft)]">Why This Demo Lands</p>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white">
              그냥 챗봇이 아니라,
              <br />
              한국적 상황을 풀어주는 멀티모달 제품처럼 보이게.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4 border-t border-white/14 pt-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--sand)]">Demo Flow</p>
              {deploymentSteps.map((step, index) => (
                <p key={step} className="flex gap-4 text-sm leading-7 text-white/76">
                  <span className="font-[var(--font-display)] text-2xl text-[var(--accent-soft)]">0{index + 1}</span>
                  <span>{step}</span>
                </p>
              ))}
            </div>
            <div className="space-y-4 border-t border-white/14 pt-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--sand)]">Home Server Angle</p>
              <p className="text-sm leading-7 text-white/76">
                같은 도메인에서 프론트가 `/backend/*` 프록시로 API를 때리도록 설계해서, 홈서버 배포 시 자주 부딪히는 CORS 설정 스트레스를 줄였습니다.
              </p>
              <p className="text-sm leading-7 text-white/76">
                카나나 API 키는 브라우저가 아니라 Spring Boot 서버 환경변수에서만 읽고, 오디오 스트림은 서버에서 WAV로 합쳐 프론트에 전달합니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
