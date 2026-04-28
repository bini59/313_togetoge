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
