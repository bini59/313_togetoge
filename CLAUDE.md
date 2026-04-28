# GBC Timeline — Project Instructions

> 이 파일은 글로벌 `~/.claude/CLAUDE.md`를 보완하는 **프로젝트 전용 지침**.
> 글로벌의 `coding-style.md`는 **이 프로젝트에서는 따르지 않는다** (스타일은 프로젝트 컨벤션을 따름).

## 도메인

- **걸즈 밴드 크라이(Girls Band Cry)** 연대기 웹.
- 라이브/페스/앨범/TVA/극장판 등 이벤트가 시간순으로 자동 재생되는 인터랙티브 타임라인.
- 음원은 YouTube 임베드만 사용 (저작권).

## 스택 (변경 금지 사항)

- Next.js (App Router, Turbopack)
- pnpm — `npm`/`yarn` 명령 금지
- Tailwind CSS v4 — `tailwind.config.js` 없음, CSS-first 설정 (`@theme` in globals.css)
- Supabase — 동적 데이터 (참여 카운트, 댓글)
- Zustand — 재생 상태
- Vitest + Testing Library — 테스트

## 데이터 분리 원칙

- **정적 데이터** (이벤트, 곡, 셋리스트): `data/timeline.ts`. 코드에서 import.
  - 새 이벤트/곡 추가 시 여기서만 수정. Supabase 건드리지 않음.
- **동적 데이터** (참여 카운트, 댓글): Supabase.

## 로컬 인프라 — docker-compose 스택

이 프로젝트는 호스티드 Supabase에 의존하지 않고 **로컬 docker-compose**로 풀스택을
띄울 수 있다. **호스티드 Supabase가 아닌 자체 PostgREST 호환 스택**이다.

```bash
cp .env.docker.example .env       # 최초 1회
docker compose up -d --build      # 4개 서비스
# 앱   → http://localhost:3200
# REST → http://localhost:8000/rest/v1/...
docker compose down               # 컨테이너만 제거 (볼륨 유지)
docker compose down -v            # DB 데이터까지 초기화
```

### 서비스 구성

| 서비스 | 이미지 | 역할 |
|---|---|---|
| `db` | `postgres:17-alpine` | Postgres. 호스트 포트 미노출 (다른 컨테이너가 5432 점유). 첫 부팅 시 `docker/db/init/`의 SQL 순차 실행. |
| `postgrest` | `postgrest/postgrest:v12.2.3` | Supabase REST 호환 API. `authenticator` 롤로 접속 → JWT의 `role` 클레임으로 권한 전환 (`anon`/`service_role`). |
| `gateway` | `caddy:2-alpine` | `/rest/v1/*` 경로만 PostgREST로 프록시. Auth/Realtime/Storage는 미구현(불필요). 호스트 8000 노출. |
| `app` | `Dockerfile` (multi-stage) | Next.js standalone 빌드. 호스트 `${APP_PORT:-3200}` 노출 (3000은 다른 컨테이너 점유). |

### DB 초기화 파일 — `docker/db/init/`

순서가 중요. Postgres가 알파벳 순으로 실행하므로 prefix 번호를 유지할 것.

- `01_roles.sql` — `anon` / `authenticated` / `service_role` / `authenticator` 롤 생성, default privileges 부여.
- `02_schema.sql` — 테이블/인덱스/RLS 정책 + 명시적 grants. `supabase/schema.sql`과 **수동 동기화 필요**.

> ⚠️ **schema.sql 변경 시 반드시 두 곳 모두 업데이트**: `supabase/schema.sql` (호스티드용) + `docker/db/init/02_schema.sql` (로컬용). drift 방지.
> ⚠️ init SQL은 **빈 데이터 디렉토리에서만 실행**됨. 컨테이너 운영 중 스키마 변경은 `docker compose exec db psql ...`로 직접 적용.

### JWT

`.env.docker.example`의 anon/service_role 키는 `SUPABASE_JWT_SECRET`으로 미리 서명된 HS256 토큰.
secret을 바꾸면 두 키도 재발급:

```bash
SUPABASE_JWT_SECRET="새 시크릿" node scripts/gen-jwt.mjs
```

### 환경변수 흐름

- `.env` → docker-compose가 변수 치환에 사용 (JWT 키, 포트).
- 앱 컨테이너에는 `compose.yml`이 직접 주입: `NEXT_PUBLIC_SUPABASE_URL=http://gateway:8000` (도커 네트워크 내부 호스트명).
- 호스트의 `pnpm dev`에서 docker Supabase에 붙으려면 별도 `.env.local`이 필요 (`NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000` 등). 기본은 그렇게 설정 안 되어 있음.

### 검증된 동작 (2026-04 시점)

- 페이지 로드, `/api/participate` GET/POST, `/api/comments` GET/POST 모두 round-trip.
- 참여 중복방지: 동일 쿠키로 두 번째 클릭 시 `alreadyParticipated:true`, count 그대로.
- 새로고침 후 참여 상태 복원 (`gbc_client_id` 쿠키 + GET 쿼리).

## 중복 방지 (참여 버튼)

- 클라이언트는 쿠키에 익명 UUID(`gbc_client_id`)를 보유.
- API 라우트에서 `(event_id, client_id)` UNIQUE 제약으로 중복 차단.
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
