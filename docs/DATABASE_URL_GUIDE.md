# DATABASE_URL 설정 안내

이 문서는 부트캠프 통합운영 플랫폼이 PostgreSQL 데이터베이스에 접속할 때 사용하는
`DATABASE_URL`의 의미와 설정 방법을 설명한다. 기능 구현 진행사항과 독립된 운영 안내서다.

## 1. DATABASE_URL이란

`DATABASE_URL`은 API 서버, Drizzle migration, seed 명령이 PostgreSQL 서버에 접속하기
위해 읽는 환경변수다. 다음 정보를 하나의 연결 문자열로 표현한다.

- 데이터베이스 종류
- 접속 계정과 비밀번호
- 데이터베이스 서버 주소와 포트
- 사용할 데이터베이스 이름
- 필요 시 TLS/SSL 같은 추가 접속 옵션

이 값이 없으면 애플리케이션 코드는 빌드할 수 있지만, migration·seed 실행이나 실제
운영 데이터 조회·저장은 수행할 수 없다.

## 2. 기본 형식

```text
postgresql://사용자명:비밀번호@서버주소:포트/데이터베이스명
```

로컬 개발 예시:

```env
DATABASE_URL=postgresql://bootcamp:change-me@127.0.0.1:5432/bootcamp
```

각 항목의 의미:

| 항목 | 예시 | 설명 |
|---|---|---|
| 사용자명 | `bootcamp` | PostgreSQL 로그인 역할 |
| 비밀번호 | `change-me` | 해당 역할의 비밀번호 |
| 서버주소 | `127.0.0.1` | PostgreSQL이 실행되는 호스트 |
| 포트 | `5432` | PostgreSQL 기본 포트 |
| 데이터베이스명 | `bootcamp` | 플랫폼 전용 데이터베이스 |

## 3. 환경별 예시

### 로컬 PC

```env
DATABASE_URL=postgresql://bootcamp:local-password@127.0.0.1:5432/bootcamp
```

### Docker Compose

API 컨테이너와 PostgreSQL 컨테이너가 같은 Docker network에 있을 때는 `localhost`가
아니라 PostgreSQL 서비스 이름을 사용한다.

```env
DATABASE_URL=postgresql://bootcamp:container-password@postgres:5432/bootcamp
```

### 관리형 PostgreSQL

대학 또는 클라우드에서 제공한 호스트, 계정, 데이터베이스명을 사용한다. 제공자가 TLS를
요구하면 접속 옵션도 포함한다.

```env
DATABASE_URL=postgresql://bootcamp_app:strong-password@db.example.ac.kr:5432/bootcamp?sslmode=require
```

정확한 SSL 옵션과 인증서 적용 방식은 해당 PostgreSQL 제공기관의 접속 지침을 우선한다.

## 4. 값을 준비하는 방법

DB 관리자에게 다음 항목을 요청한다.

1. 개발·검증·운영 환경별 PostgreSQL 호스트와 포트
2. 플랫폼 전용 데이터베이스 이름
3. migration 전용 계정과 애플리케이션 runtime 계정
4. 각 계정의 권한 범위
5. TLS 필수 여부와 CA 인증서 제공 방식
6. 접근 가능한 네트워크 또는 방화벽 허용 대역
7. 연결 수 제한과 connection pool 권장값
8. 백업, PITR, 장애복구 정책

권장 계정 분리:

- migration 계정: 스키마 생성·변경 권한
- runtime 계정: 운영에 필요한 테이블 조회·등록·수정 권한
- 조회 계정: 감사·리포트 용도의 읽기 전용 권한

## 5. 저장 위치

로컬 개발에서는 저장소 루트의 `.env` 파일에 설정할 수 있다.

```env
DATABASE_URL=postgresql://bootcamp:local-password@127.0.0.1:5432/bootcamp
```

`.env` 파일과 실제 접속 비밀번호는 Git에 커밋하지 않는다. `.env.example`에는 구조를
알려주는 가짜 값만 유지한다. 운영환경에서는 배포 플랫폼의 Secret Manager, Kubernetes
Secret, CI/CD protected secret 등 승인된 비밀정보 저장소를 사용한다.

PowerShell 현재 세션에만 임시 설정하는 예:

```powershell
$env:DATABASE_URL="postgresql://bootcamp:local-password@127.0.0.1:5432/bootcamp"
```

## 6. 특수문자가 있는 비밀번호

비밀번호에 `@`, `:`, `/`, `?`, `#`, `%` 같은 URL 예약문자가 있으면 percent-encoding이
필요하다.

예를 들어 실제 비밀번호가 `p@ss:word`이면 연결 문자열에는 다음처럼 표현한다.

```text
p%40ss%3Aword
```

비밀번호 자체를 임의로 변경하지 말고, URL 인코딩된 값을 연결 문자열에 사용한다.

## 7. 연결 후 실행 순서

저장소 루트에서 다음 순서로 확인한다.

```powershell
Copy-Item .env.example .env
# .env의 POSTGRES_PASSWORD와 DATABASE_URL 비밀번호를 동일하게 변경
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:seed
pnpm db:verify
pnpm verify
```

- `migrate`: Drizzle migration을 적용해 테이블과 제약조건을 생성한다.
- `seed`: 역할, 사업연도 등 초기 기준 데이터를 등록한다.
- 두 번째 `seed` 실행은 개발 기준정보의 중복 방지를 검증한다.
- 개발 seed는 `NODE_ENV=production` 또는 `SEED_PROFILE=production`에서 실행을 거부한다.
- 운영 DB에 migration을 적용하기 전에는 백업 상태와 적용 대상 DB를 다시 확인한다.
- seed는 개발·초기 구축용 데이터 범위를 검토한 후 운영환경에 적용한다.

## 8. 자주 발생하는 오류

| 증상 | 확인사항 |
|---|---|
| connection refused | PostgreSQL 실행 여부, 호스트, 포트, 방화벽 |
| password authentication failed | 사용자명·비밀번호, URL 인코딩 |
| database does not exist | 데이터베이스명과 생성 여부 |
| permission denied | migration/runtime 계정 권한 |
| SSL required | `sslmode=require`와 인증서 설정 |
| timeout | VPN, private network, 보안그룹, DNS |
| 로컬에서는 되지만 컨테이너에서 실패 | 컨테이너 안의 `localhost` 대신 DB 서비스명 사용 |

## 9. 보안 원칙

- 실제 `DATABASE_URL`을 Git, 이슈, 메신저, 화면 캡처에 노출하지 않는다.
- 운영 비밀번호는 주기적으로 교체하고 담당자 변경 시 즉시 회수한다.
- DB를 공용 인터넷에 직접 공개하지 않고 private network 또는 승인된 접근 경로를 사용한다.
- 애플리케이션에는 최소권한 runtime 계정을 사용한다.
- migration 실행 권한은 배포 작업에만 제한한다.
- 로그와 오류 응답에 전체 연결 문자열이 출력되지 않도록 한다.
- 개발·검증·운영 DB와 계정을 분리한다.

## 10. 현재 프로젝트에서 필요한 조치

대학 또는 운영 인프라 담당자가 접속정보를 제공하면 다음 작업을 진행할 수 있다.

1. 개발/검증 환경 `DATABASE_URL` 등록
2. DB 연결 확인
3. migration 적용
4. seed 적용
5. API 서버 기동 및 `/api/healthz` 확인
6. 역할별 주요 API와 import 재업로드 중복방지 검증
7. 운영환경 Secret 등록 및 배포

대학 SSO 접속정보와 `DATABASE_URL`은 서로 다른 설정이다. SSO는 사용자 인증을 담당하고,
`DATABASE_URL`은 플랫폼의 PostgreSQL 데이터 저장소 연결을 담당한다.
