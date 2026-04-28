# GBC Timeline

걸즈 밴드 크라이(Girls Band Cry) 연대기 웹 — 자동 스크롤로 재생되는 인터랙티브 타임라인.

## Features

- **자동 재생 연대기**: 스크롤이 시간순으로 자동 진행되며 각 이벤트마다 관련 곡(YouTube)이 재생됨
  - 라이브 / 페스 → 셋리스트에서 랜덤 1곡
  - 앨범 → 타이틀곡
  - TVA / 극장판 / 신곡 / 영상 → 매핑된 곡
- **이벤트 타입**: `live` / `fes` / `album` / `youtube` / `new_song` / `radio` / `bd` / `tva` / `movie` …(확장)
- **참여 버튼**: 이벤트 타입에 따라 라벨이 다름(라이브 참여 / 페스 참여 / 앨범 구매 / …). 누른 횟수 카운트 표시. 쿠키 기반 중복 방지.
- **익명 댓글**: 닉네임 없음, 작성 후 삭제 불가.
- **홈(Overview)**: 진입 시 전체 연대기 한눈에. 거기서 "재생 시작" 버튼으로 자동 스크롤 시작.

## Stack

- Next.js 16 (App Router) + React 19
- pnpm
- Tailwind CSS v4
- Supabase (Postgres) — 참여 카운트 + 댓글
- Zustand — 재생 상태
- YouTube IFrame API
- Vitest + Testing Library — 단위/컴포넌트 테스트
- Husky + lint-staged — pre-commit lint + tsc + test

## 디렉토리

```
app/                 Next.js App Router (layout, page, api/)
  api/
    participate/     POST: 이벤트 참여 +1
    comments/        GET/POST: 익명 댓글
components/          UI 컴포넌트 (Timeline, EventCard, Player, Comments)
data/                정적 타임라인 데이터 (events, songs, setlists)
lib/                 supabase client, types, store, utils
supabase/            SQL 마이그레이션
tests/               vitest 테스트
.claude/             프로젝트 전용 agents/skills/CLAUDE.md
```

## 데이터 모델

**정적 (data/timeline.ts)**
- `events`: 타임라인 항목 (date, type, title, description, youtubeId 또는 setlistId)
- `songs`: 곡 메타 (id, title, youtubeId)
- `setlists`: live/fes 셋리스트 (eventId → songIds[])

**동적 (Supabase)**
- `participations`: `event_id` (PK), `count` (int)
- `participation_clients`: `event_id` + `client_id` (UUID 쿠키, UNIQUE) — 중복 방지
- `comments`: `id`, `event_id`, `content`, `created_at`

## 환경 변수

`.env.local` 생성:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # API 라우트에서만 사용
```

## 실행

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm test         # vitest (단위/컴포넌트)
pnpm test:e2e     # Playwright E2E (자동으로 dev 서버 기동)
pnpm lint
pnpm typecheck    # tsc --noEmit
```

Supabase 스키마는 `supabase/schema.sql`을 Supabase 대시보드 SQL Editor에 붙여넣어 적용.

## Pre-commit Hook

커밋 시 자동 실행:
1. `lint-staged` (eslint --fix on staged files)
2. `tsc --noEmit`
3. `vitest run`

세 단계 모두 통과해야 커밋됨. (`--no-verify` 사용 금지)

## 데이터 추가/수정

이벤트는 `data/timeline.ts`에서 직접 편집. Supabase 건드릴 필요 없음.

```ts
{
  id: 'live-2024-08-25',
  date: '2024-08-25',
  type: 'live',
  title: '東京キネマ倶楽部 ワンマン',
  description: '...',
  setlistId: 'live-2024-08-25',
}
```

## License

Personal / fan project. 모든 음원/영상은 YouTube 임베드를 통해서만 노출됨.
