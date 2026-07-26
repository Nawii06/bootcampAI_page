# 배포 전 점검표

이 문서는 부트캠프 통합운영 플랫폼을 검증·운영 환경에 배포하기 위한 최종 점검표다.

## 1. 외부 접속정보

- [ ] 환경별 `DATABASE_URL`이 Secret 저장소에 등록되어 있다.
- [ ] migration 계정과 API runtime 계정이 분리되어 있다.
- [ ] 운영 DB 백업 또는 PITR 시점이 확보되어 있다.
- [ ] `CORS_ALLOWED_ORIGINS`에 실제 포털 origin만 등록되어 있다.
- [ ] `FILE_STORAGE_DIR` 또는 운영용 object storage adapter가 설정되어 있다.
- [ ] 외부 import가 필요하면 `IMPORT_API_ALLOWED_HOSTS`가 최소 범위로 설정되어 있다.
- [ ] 대학 SSO 정보 제공 후 issuer, client ID, redirect URI를 검증했다.
- [ ] SSO client secret은 저장소와 로그에 노출되지 않는다.

`DATABASE_URL` 상세 설정은 [DATABASE_URL_GUIDE.md](./DATABASE_URL_GUIDE.md)를 참고한다.

## 2. 자동 검증

저장소 루트에서 실행한다.

```powershell
pnpm verify
```

이 명령은 다음을 확인한다.

1. API 단위·계약 테스트
2. 라이브러리 및 애플리케이션 typecheck
3. API 서버와 포털 production build

추가 정적 확인:

```powershell
git diff --check
rg "localStorage|storageService|mockData|seedData|performanceService" artifacts/bootcamp-portal/src
```

두 번째 검색 결과는 없어야 한다.

## 3. DB 적용

- [ ] 적용 대상 DB 호스트와 데이터베이스명을 재확인했다.
- [ ] `lib/db/drizzle`의 신규 SQL을 DBA 또는 배포 담당자가 검토했다.
- [ ] migration 실행 전 백업 상태를 확인했다.
- [ ] `pnpm --filter @workspace/db migrate`가 성공했다.
- [ ] 초기 구축 환경에서만 seed 범위를 검토한 후 `pnpm --filter @workspace/db seed`를 실행했다.
- [ ] 테이블, 인덱스, 외래키, enum이 예상대로 생성되었다.

운영 DB에서는 `push` 또는 `push-force`를 사용하지 않고 검토된 migration을 적용한다.

## 4. 인증과 권한

- [ ] production에서 `ENABLE_MOCK_AUTH`가 비활성화되어 있다.
- [ ] 미인증 요청이 보호 API에서 401을 반환한다.
- [ ] 역할이 없는 사용자가 보호 API에서 403을 반환한다.
- [ ] `SYSTEM_ADMIN`과 `AUDITOR` 접근 범위를 검토했다.
- [ ] 학생은 본인의 신청·이수·포트폴리오만 조회할 수 있다.
- [ ] 기업 사용자는 승인되어 연결된 자기 기업 데이터만 변경할 수 있다.
- [ ] 개인정보 조회·수정·다운로드가 audit log에 남는다.

역할별 최소 smoke test:

| 역할 | 확인 화면/기능 |
|---|---|
| PUBLIC | 공개 홈페이지, 공개 승인 콘텐츠·성과 |
| STUDENT | 프로그램 신청, 신청현황, 이수현황, 포트폴리오 |
| COMPANY_MANAGER | 수요조사, 프로젝트, 공개동의 포트폴리오 평가 |
| EDUCATION_STAFF | 프로그램·신청·출석·이수관리 |
| BENEFIT_STAFF | 수혜정책·대상자·승인 |
| COMPANY_STAFF | 기업신청 검토·참여기업 |
| BUDGET_STAFF | 예산배정·집행·변경이력 |
| PERFORMANCE_STAFF | 지표·목표·실적·자체평가·증빙 |
| CONTENT_EDITOR | 공지·자료실 CMS |
| REVIEWER | 공개·이수·기업 등 승인 |
| AUDITOR | 감사·상태 조회, 변경 불가 |
| SYSTEM_ADMIN | 전역 관리 |

## 5. 핵심 업무 시나리오

- [ ] 교과목 파일을 staging → validation → preview → commit 순서로 처리한다.
- [ ] 동일 `source_system + external_id` 파일을 재업로드해도 중복 생성되지 않는다.
- [ ] 프로그램 정원, 신청기간, 신청자격 검증이 동작한다.
- [ ] 신청 → 선발 → 출석 → 과제 → 만족도 → 이수확정 흐름이 동작한다.
- [ ] 학생 이수결과가 수동 boolean이 아닌 교육과정 요건으로 계산된다.
- [ ] 평가와 수혜 산정에 사용한 계산 snapshot이 보존된다.
- [ ] 기업신청 승인 후 기업 마스터와 담당자가 생성된다.
- [ ] 예산 금액 변경 시 변경사유와 변경이력이 보존된다.
- [ ] 공개 승인된 콘텐츠와 성과만 공개 홈페이지에 노출된다.

## 6. 파일과 개인정보

- [ ] 허용 확장자, MIME, 파일 시그니처, 20MB 제한이 동작한다.
- [ ] DB 저장 실패 시 디스크에 고아 파일이 남지 않는다.
- [ ] 개인정보 포함 파일은 기본 비공개다.
- [ ] 계좌번호 등 불필요한 금융정보 입력항목이 없다.
- [ ] 파일 저장소 백업·암호화·보존기간 정책이 설정되어 있다.

## 7. 기동 후 smoke test

- [ ] `/api/healthz`가 정상 응답한다.
- [ ] `/api/v1/session`이 SSO 세션 사용자를 반환한다.
- [ ] 시스템 설정 상태 화면에서 DB 연결을 확인한다.
- [ ] 공개 홈페이지 주요 경로가 정상 표시된다.
- [ ] 역할별 메뉴와 API 접근 결과가 일치한다.
- [ ] API 5xx, DB pool, 파일 오류, audit log 실패 모니터링이 연결되어 있다.

## 8. 배포 승인 기록

배포 일시, migration 버전, 애플리케이션 commit SHA, 승인자, 롤백 기준을 내부
배포 기록에 남긴다. 실제 DB 접속 문자열과 SSO secret은 기록하지 않는다.
