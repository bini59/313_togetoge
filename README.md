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
- Cloudflare Workers (`@opennextjs/cloudflare`) + D1 (SQLite) — 참여 카운트 + 댓글
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
lib/                 db (D1 쿼리), types, store, utils
migrations/          D1 마이그레이션 (SQLite)
scripts/             export-postgres-to-d1.sh (구 Postgres → D1 데이터 이전)
tests/               vitest 테스트
.claude/             프로젝트 전용 agents/skills/CLAUDE.md
```

## 데이터 모델

**정적 (data/timeline.ts)**
- `events`: 타임라인 항목 (date, type, title, description, youtubeId 또는 setlistId)
- `songs`: 곡 메타 (id, title, youtubeId)
- `setlists`: live/fes 셋리스트 (eventId → songIds[])

**동적 (D1)**
- `participation_clients`: `event_id` + `client_id` (UUID 쿠키, UNIQUE) — 중복 방지
- `comments`: `id`, `event_id`, `content`, `client_id`(rate limit용), `created_at`
- `participation_counts` (view): 이벤트별 참여 수

## 환경 변수

필요 없음. D1은 `wrangler.jsonc`의 `DB` 바인딩으로 연결됩니다.

## 실행

```bash
pnpm install
pnpm db:migrate:local   # 로컬 D1 스키마 (최초 1회)
pnpm dev          # http://localhost:3000
pnpm build
pnpm test         # vitest (단위/컴포넌트)
pnpm test:e2e     # Playwright E2E (자동으로 dev 서버 기동)
pnpm lint
pnpm typecheck    # tsc --noEmit
pnpm preview      # OpenNext 빌드 + wrangler dev (Workers 런타임)
```

## 배포 (Cloudflare Workers)

`.github/workflows/deploy.yml`을 Actions 탭에서 수동 실행하면 D1 마이그레이션 적용 → OpenNext 빌드 → `wrangler deploy` 순으로 배포합니다. main merge만으로는 배포되지 않습니다.

기존 GHCR → Flux/k3s 이미지 발행은 `build-legacy-image.yml`에 수동 실행 전용으로 보존했습니다. `source_ref`는 Dockerfile이 남아 있는 전환 전 커밋(기본값 `b8c1154`)을 지정합니다. 현재 브랜치에는 Dockerfile이 없습니다. 이 워크플로를 실행하면 Flux가 해당 이미지를 운영에 반영할 수 있으므로, 기존 k3s로 롤백할 때만 사람이 실행합니다.

최초 1회 준비:
1. `pnpm exec wrangler d1 create togetoge` → 출력된 id를 `wrangler.jsonc`의 `database_id`에 넣고 커밋.
2. GitHub 시크릿 `CLOUDFLARE_API_TOKEN`(Workers Scripts:Edit, D1:Edit), `CLOUDFLARE_ACCOUNT_ID` 등록.

## Pre-commit Hook

커밋 시 자동 실행:
1. `lint-staged` (eslint --fix on staged files)
2. `tsc --noEmit`
3. `vitest run`

세 단계 모두 통과해야 커밋됨. (`--no-verify` 사용 금지)

## 데이터 추가/수정

이벤트는 `data/timeline.ts`에서 직접 편집. D1 건드릴 필요 없음.

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
