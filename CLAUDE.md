# GBC Timeline — Project Instructions

> 이 파일은 글로벌 `~/.claude/CLAUDE.md`를 보완하는 **프로젝트 전용 지침**.
> 글로벌의 `coding-style.md`는 **이 프로젝트에서는 따르지 않는다** (스타일은 프로젝트 컨벤션을 따름).

## 도메인

- **걸즈 밴드 크라이(Girls Band Cry)** 연대기 웹.
- 라이브/페스/앨범/TVA/극장판 등 이벤트가 시간순으로 자동 재생되는 인터랙티브 타임라인.
- 음원은 YouTube 임베드만 사용 (저작권).

## 스택 (변경 금지 사항)

- Next.js (App Router, Turbopack) — Cloudflare Workers에서 `@opennextjs/cloudflare`로 실행
- pnpm — `npm`/`yarn` 명령 금지
- Tailwind CSS v4 — `tailwind.config.js` 없음, CSS-first 설정 (`@theme` in globals.css)
- Cloudflare D1 (SQLite, 바인딩 `DB`) — 동적 데이터 (참여 카운트, 댓글)
- Zustand — 재생 상태
- Vitest + Testing Library — 테스트

## 데이터 분리 원칙

- **정적 데이터** (이벤트, 곡, 셋리스트): `data/timeline.ts`. 코드에서 import.
  - 새 이벤트/곡 추가 시 여기서만 수정. D1 건드리지 않음.
- **동적 데이터** (참여 카운트, 댓글): D1.

## D1 / Workers

- 스키마: `migrations/NNNN_*.sql` (wrangler D1 마이그레이션). 스키마 변경은 **새 파일 추가**로만. 적용된 파일은 수정 금지.
- SQL은 `lib/db/queries.ts`에만 둔다. 함수는 `D1Database`를 인자로 받고, 라우트는 `getDB()`(`lib/db/index.ts`)로 바인딩을 얻어 넘긴다.
- 검증/rate limit은 라우트 코드에서 한다 (RLS/DB 롤 없음). D1은 Worker 바인딩으로만 접근 가능.
- SQLite 주의점: uuid 타입 없음(앱에서 소문자 UUID 생성/정규화), 시간은 ISO-8601 UTC 문자열(`toISOString()` 형식, 문자열 비교 = 시간 비교), `ILIKE`/jsonb/배열/enum 없음.
- 쿼리 테스트는 `tests/helpers/d1.ts`의 `createTestD1()` (wrangler `getPlatformProxy`, 인메모리 로컬 D1)로 실제 SQLite에 대해 돌린다. 파일 상단에 `// @vitest-environment node`.

```bash
pnpm db:migrate:local   # .wrangler/state 로컬 D1에 마이그레이션 적용 (최초 1회 + 새 마이그레이션마다)
pnpm dev                # next dev, 로컬 D1 바인딩 사용 (initOpenNextCloudflareForDev)
pnpm preview            # OpenNext 빌드 후 wrangler dev(workerd)로 실행
```

배포는 GitHub Actions `Deploy (Cloudflare Workers)` 워크플로를 **수동 실행**(workflow_dispatch)할 때만 일어난다. main merge로는 배포되지 않는다.
필요한 시크릿: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. `wrangler.jsonc`의 `database_id`가 자리표시자면 워크플로가 실패한다.

## 중복 방지 (참여 버튼)

- 클라이언트는 쿠키에 익명 UUID(`gbc_client_id`)를 보유.
- API 라우트에서 `(event_id, client_id)` UNIQUE 제약 + `ON CONFLICT DO NOTHING`으로 중복 차단.
- 쿠키 삭제 시 재참여 가능 — 이는 의도적 한계로 허용 (강한 차단 불필요).

## 커밋 규칙

- pre-commit hook으로 **lint + tsc + vitest** 모두 통과해야 커밋됨.
- `--no-verify` 절대 사용 금지.
- 커밋 메시지: conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`).

## 작업 흐름

글로벌 `dev-process.md`를 따르되, 이 프로젝트는 단일 개발자 + 단일 도메인이므로:
- **경량 트랙 기본**. planner 호출은 동시 수정 파일 8개 이상일 때만.
- TDD 권장하되 강제는 아님. 단, 새 API 라우트와 lib 함수는 vitest 테스트 필수.

## 글로벌 지침에서 제외

- `~/.claude/rules/coding-style.md` — **적용하지 않음**. 프로젝트 ESLint/Prettier 설정을 따른다.
- 그 외 글로벌 지침(testing, security, git-workflow, agents 등)은 모두 적용.
