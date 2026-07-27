# 교과목 데이터 가져오기

## 상태 흐름

`UPLOADED → STAGED → VALIDATED → PREVIEWED → COMMITTED`

오류 시 `FAILED`, 사용자 취소 시 `CANCELLED`로 전환한다. `COMMITTED` job은 재실행하지
않으며 동일 파일 해시 재업로드는 기존 job을 안내한다.

1. 업로드: 확장자, 크기, MIME/signature를 검증하고 SHA-256을 계산한다.
2. staging: CSV/XLSX/JSON/API 응답을 원문 행과 정규화 행으로 분리 저장한다.
   XLSX는 `read-excel-file`, CSV는 `csv-parse`로 해석하며 파일당 최대
   5MB, 10,000행, 100열을 허용한다. 빈 헤더와 중복 헤더는 staging 전에
   거부한다.
3. validation: 필수값, 코드값, 학점 범위, 연도·학기, 외부키 중복을 검증한다.
4. preview: insert/update/unchanged/error 건수와 변경 전후 diff를 제공한다.
5. commit: 오류가 없는 job만 transaction으로 idempotent upsert하고 audit를 기록한다.

`source_system + external_id`가 있으면 이를 자연키로 사용한다. 외부키가 없으면
기관이 승인한 별도 매핑 규칙 없이는 자동 병합하지 않는다.
