# 눈치봇 | K-Context Guide

사진과 목소리만으로 한국 생활 속 장면을 이해하고 설명해주는 카나나 기반 멀티모달 웹 데모입니다.

## Portfolio Highlights

- 이미지, 브라우저 WAV 녹음, 텍스트 질문을 함께 받아 한국 생활 맥락을 설명하는 멀티모달 데모입니다.
- Spring Boot 백엔드가 API 키와 모델 호출을 담당하고, Next.js 프론트는 `/backend/*` 프록시 경로로만 통신하도록 구성했습니다.
- Kanana OpenAI-compatible endpoint에 이미지/audio/text payload를 전달하고, streaming text/audio delta를 수집해 WAV 응답으로 정리합니다.
- API 키가 없거나 외부 호출이 실패해도 fallback 응답으로 UI 흐름을 유지하도록 설계했습니다.
- `docker-compose.yml`로 홈서버에서 프론트/백엔드를 함께 띄울 수 있게 구성했습니다.

## My Role

- Next.js 16 App Router 기반 analyzer UI 구현
- 브라우저 오디오를 WAV로 녹음하는 프론트엔드 유틸 구현
- Spring Boot `POST /api/analyze` multipart API 구현
- Kanana OpenAI-compatible streaming response parsing
- PCM audio chunk를 WAV로 합치는 backend utility 구현
- Docker Compose 기반 로컬/홈서버 실행 구성

## 구성
- `frontend`: Next.js 16 App Router 기반 데모 웹
- `backend`: Spring Boot API 서버
- `docker-compose.yml`: 홈서버용 프론트/백엔드 동시 실행 구성

## 현재 MVP 범위
- 이미지 업로드
- 브라우저 WAV 음성 녹음
- 텍스트 질문 입력
- 모드 선택: `guide`, `menu`, `study`, `ad`, `podcast`
- Spring Boot `POST /api/analyze` 멀티파트 업로드 처리
- 카나나 OpenAI-compatible 엔드포인트 호출
- 카나나 스트리밍 오디오 청크를 WAV로 병합해 프론트에 전달
- API 키 미설정 시 데모 fallback 응답

## 실행 전 준비
1. 루트에서 환경변수 예시를 복사합니다.
2. `KANANA_API_KEY`를 실제 값으로 채웁니다.

```bash
cp .env.example .env
```

## 로컬 개발 실행
백엔드:

```bash
cd backend
mvn spring-boot:run
```

프론트:

```bash
cd frontend
BACKEND_INTERNAL_URL=http://localhost:8080 npm run dev
```

접속:
- 프론트: `http://localhost:3000`
- 백엔드: `http://localhost:8080`

## 홈서버용 Docker 실행
```bash
docker compose up --build -d
```

기본 포트:
- `3000`: Next.js 프론트
- `8080`: Spring Boot 백엔드

프론트는 브라우저에서 `/backend/*` 경로로 요청하고, Next.js 서버가 `BACKEND_INTERNAL_URL`로 프록시합니다. 그래서 홈서버 배포 시 브라우저에 백엔드 주소를 직접 노출하지 않아도 됩니다.

## API 계약
### `POST /api/analyze`
- Content-Type: `multipart/form-data`
- Fields:
  - `image`: 이미지 파일, optional
  - `audio`: WAV 파일, optional
  - `question`: 질문 문자열, optional
  - `mode`: `guide | menu | study | ad | podcast`

응답 예시:

```json
{
  "traceId": "4ec2a0f8-6a9a-4f0f-95de-d83e4d9d4b72",
  "mode": "menu",
  "summary": "업로드된 이미지는 메뉴판 또는 음식 관련 장면으로 보입니다.",
  "intent": "덜 맵거나 실패 확률이 낮은 메뉴를 추천받고 싶어 합니다.",
  "answer": "매운맛이 걱정될 때는 ...",
  "usefulPhrases": ["덜 맵게 해주세요."],
  "cautions": ["현재 응답은 카나나 실연동 전 데모 fallback입니다."],
  "suggestedActions": ["영어로 번역하기", "더 쉽게 설명하기"],
  "audioBase64": null,
  "audioMimeType": null,
  "usedFallback": true,
  "fallbackReason": "KANANA_API_KEY is empty",
  "rawText": "..."
}
```

## 카나나 연동 방식
백엔드는 사용자가 주신 OpenAI-compatible 샘플 흐름을 그대로 따릅니다.
- `base_url=https://kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com/v1`
- `model=kanana-o`
- 이미지 입력: `image_url.url`에 base64 문자열 전달
- 음성 입력: `input_audio.data`에 base64 WAV 전달
- 응답: `stream=true`로 받아 텍스트와 audio delta를 수집

## 참고 사항
- 브라우저 녹음은 WAV로 인코딩해서 보냅니다.
- 백엔드는 카나나에서 내려오는 PCM 오디오 청크를 하나의 WAV 파일로 합칩니다.
- 카나나 API 키가 없거나 호출이 실패하면 데모 fallback 응답으로 UI 흐름은 유지됩니다.
