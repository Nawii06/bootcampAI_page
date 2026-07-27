# Preview Fake Data Set

실제 PostgreSQL 구축 전 공개 포털 preview를 확인하기 위한 개발 전용 데이터셋이다.
운영 데이터 저장소나 migration seed를 대체하지 않는다.

## FD_Set_01

- 데이터셋 ID: `FD_Set_01`
- 파일: `artifacts/bootcamp-portal/fake-data/FD_Set_01.json`
- 범위: 공개 데이터와 14개 역할 시나리오용 가상 사용자·학생·신청·이수·수혜 데이터
- 모든 응답 헤더: `X-Fake-Data-Set: FD_Set_01`
- 활성화 시 화면 상단에 Fake Data 경고 배너 표시
- production build에서는 개발용 API adapter가 동작하지 않음
- 가상 세션은 HttpOnly·SameSite=Lax 쿠키를 사용하며 localStorage에 저장하지 않음
- 변경 데이터와 서명키는 메모리에만 존재하며 서버 재시작 시 초기화됨

## 실행

PowerShell:

```powershell
$env:PORTAL_PORT="4173"
$env:BASE_PATH="/"
$env:FAKE_DATA_SET="FD_Set_01"
pnpm --filter @workspace/bootcamp-portal dev
```

데이터셋 목록:

```powershell
pnpm fake-data:list
pnpm fake-data:validate FD_Set_01
```

`/login`에서 학생 3개 시나리오, 기업신청자·기업담당자, 각 업무 담당자, 검토자,
시스템관리자, 감사자 계정을 선택한다. 대학 SSO 버튼은 실제 연동정보가 제공될 때까지
비활성 상태다. 시스템관리자는 `POST /api/v1/fake-data/reset`으로 메모리 데이터를
원본 fixture 상태로 복구할 수 있다.

## 비활성화

서버를 종료한 후 환경변수를 제거하고 다시 실행한다.

```powershell
Remove-Item Env:FAKE_DATA_SET
```

이 방법은 파일을 보존하므로 나중에 다시 사용할 수 있다.

## 완전 삭제

다음 명령은 `FD_Set_01.json`을 실제로 삭제한다.

```powershell
pnpm fake-data:remove FD_Set_01
```

삭제 후 `FAKE_DATA_SET` 환경변수도 제거한다. 실제 DB 연결 후에는 이 개발 adapter를
활성화하지 않는다.

## 실제 대학 SSO와의 차이

가상 로그인은 역할별 화면 확인만 위한 개발 adapter다. 실제 issuer, client ID,
secret, 대학 인증 URL 또는 claim을 사용하지 않는다. 실제 OIDC/SAML 방식과 학번·
교직원번호·소속 claim, 계정 생성·비활성화 정책은 대학 정보 수령 전까지
`BLOCKED_EXTERNAL`이다.
