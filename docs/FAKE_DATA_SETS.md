# Preview Fake Data Set

실제 PostgreSQL 구축 전 공개 포털 preview를 확인하기 위한 개발 전용 데이터셋이다.
운영 데이터 저장소나 migration seed를 대체하지 않는다.

## FD_Set_01

- 데이터셋 ID: `FD_Set_01`
- 파일: `artifacts/bootcamp-portal/fake-data/FD_Set_01.json`
- 범위: 사업연도, 교과목, 모집 프로그램, 참여기업, 공개 성과, 소식, 자료실
- 모든 응답 헤더: `X-Fake-Data-Set: FD_Set_01`
- 활성화 시 화면 상단에 Fake Data 경고 배너 표시
- production build에서는 개발용 API adapter가 동작하지 않음

## 실행

PowerShell:

```powershell
$env:PORT="4173"
$env:BASE_PATH="/"
$env:FAKE_DATA_SET="FD_Set_01"
pnpm --filter @workspace/bootcamp-portal dev
```

데이터셋 목록:

```powershell
pnpm fake-data:list
```

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
