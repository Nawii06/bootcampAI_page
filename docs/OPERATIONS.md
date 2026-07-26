# 운영·배포

## 배포 구성

1. PostgreSQL을 private network에 배치한다.
2. migration 전용 계정으로 `pnpm --filter @workspace/db migrate`를 실행한다.
3. runtime 최소권한 DB 계정으로 API 서버를 실행한다.
4. 포털 정적 파일과 `/api` reverse proxy를 동일 origin으로 제공한다.
5. 증빙파일은 운영에서 암호화된 object storage adapter로 교체한다.

## 필수 환경변수

- `DATABASE_URL`
- `PORT`
- `BASE_PATH`
- `FILE_STORAGE_DIR`
- `IMPORT_API_ALLOWED_HOSTS`
- SSO 제공 후 `SSO_ISSUER`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`,
  `SSO_REDIRECT_URI`

`NODE_ENV=production`에서는 mock 인증이 항상 비활성이다.

## 배포 순서

1. DB backup 및 현재 migration 확인
2. 신규 이미지에서 typecheck/test/build
3. migration 실행
4. API rolling deployment
5. 포털 정적 자산 배포
6. `/api/healthz`, 공개 콘텐츠, 인증 callback smoke test
7. 역할별 핵심 API 접근 matrix 확인

## 백업과 복구

- PostgreSQL PITR 및 일일 snapshot을 설정한다.
- 파일 object storage의 versioning과 lifecycle을 설정한다.
- DB와 파일의 보존기간 및 개인정보 파기정책을 함께 운영한다.
- 복구훈련에서 DB 참조와 파일 object key의 일관성을 확인한다.

## 모니터링

- API 5xx, latency, DB pool saturation
- import 실패·validation 오류율
- audit 기록 실패
- 파일 업로드 거부율
- 승인 대기 건수
- 예산 잔액 음수 여부
- 공개 승인 없이 노출된 콘텐츠/성과 건수

## 운영 점검

- 매 배포: typecheck, test, build, migration dry review
- 매월: 역할·퇴직자 권한, 개인정보 접근 audit, 외부 API allowlist
- 분기: 복구훈련, 파일 악성코드 검사 정책, dependency 취약점
- 사업연도 전환: 신규 business year/term, 정책 version, 목표와 예산 seed
