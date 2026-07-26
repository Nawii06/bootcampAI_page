# 첨단산업 인재양성 부트캠프 통합운영 플랫폼

React/Vite 공개·업무 포털, Express API, PostgreSQL/Drizzle로 구성된 통합운영
플랫폼이다. 대학 ERP·RCMS는 대체하지 않으며 지급·회계 참조정보만 연계한다.

## 구성

- `artifacts/bootcamp-portal`: React 포털
- `artifacts/api-server`: Express API
- `lib/db`: Drizzle 스키마, migration, seed
- `lib/api-zod`: 서버·프론트 공유 Zod 계약
- `lib/api-client-react`: 공통 API client
- `docs`: 아키텍처, 보안, import, 운영 문서

## 로컬 준비

```bash
pnpm install --ignore-scripts
```

Windows에서는 루트 `preinstall`의 Unix `sh` 명령 때문에 `--ignore-scripts`가 필요하다.
운영 CI는 Linux에서 잠금 파일 기준으로 설치한다.

환경변수는 `.env.example`을 참고한다. PostgreSQL 연결 후:

```bash
pnpm --filter @workspace/db migrate
pnpm --filter @workspace/db seed
```

개발 서버는 API와 포털에 서로 다른 포트를 지정한다. 포털의 `/api`는 운영 reverse
proxy 또는 로컬 proxy를 통해 API 서버로 전달한다.

## 검증

```bash
pnpm typecheck
pnpm --filter @workspace/api-server test
PORT=4173 BASE_PATH=/ pnpm build
```

PowerShell:

```powershell
$env:PORT="4173"
$env:BASE_PATH="/"
pnpm build
```

## 인증

대학 SSO/OIDC 어댑터는 추후 제공되는 연동정보로 `attachAuth` 경계에 연결한다.
개발 mock 인증은 `ENABLE_MOCK_AUTH=true`일 때만 동작하며 production에서는 코드상
비활성화된다.

## 주요 보안 원칙

- 권한검사는 Express middleware와 도메인 service에서 수행한다.
- 개인정보 조회·변경·다운로드와 주요 상태변경은 audit log를 남긴다.
- 파일은 확장자, MIME, signature, 용량을 검증한다.
- 계좌번호는 저장하지 않는다.
- 외부 API import는 HTTPS와 `IMPORT_API_ALLOWED_HOSTS` allowlist를 요구한다.
- DB 변경과 audit insert는 같은 transaction에서 처리한다.

상세 내용은 [아키텍처](docs/ARCHITECTURE.md), [보안](docs/SECURITY.md),
[가져오기 절차](docs/IMPORT_WORKFLOW.md), [운영·배포](docs/OPERATIONS.md)를 참고한다.
