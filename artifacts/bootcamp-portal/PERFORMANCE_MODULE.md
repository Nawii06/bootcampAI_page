# 성과관리 모듈 안내

## 목적

부트캠프 홈페이지를 연차평가, 단계평가, 종합평가 대응용 내부 성과관리 시스템으로 확장하기 위한 관리자 모듈입니다.

## 주요 경로

- `/admin/performance`: 성과관리 대시보드
- `/admin/performance/indicators`: 성과지표 목표 관리
- `/admin/performance/results`: 연차별 실적 입력
- `/admin/performance/evidence`: 증빙자료 관리
- `/admin/performance/source-data`: 학생·기업·교육프로그램·취업 연동 기초 데이터
- `/admin/performance/export`: Excel 다운로드

## 데이터 구조

성과관리 전용 타입과 seed data는 `src/performance` 아래에 분리했습니다.

- `types.ts`: indicator, result, evidence, mapping, target version, source data 타입
- `seedData.ts`: 총괄표 기준 v1 성과지표 26건과 mock 실적·증빙·연동 데이터
- `performanceService.ts`: 조회, 저장, 계산, 증빙 매핑, Excel 내보내기 서비스

## 계산 방식

- 일반 지표: `actual_value / target_value * 100`
- 비율 지표: `numerator / denominator * 100` 후 목표값 대비 달성률 계산
- 누적 지표: 해당연도 종료 시점 누적값으로 관리하며 전년도보다 감소하면 경고
- 목표값이 없거나 분모가 0이면 계산불가로 처리
- 승인되지 않은 실적은 잠정 상태로 표시 가능하도록 계산 결과에 `provisional` 상태를 둠

## 증빙자료 관리 방식

현재 단계에서는 실제 파일 업로드 없이 metadata 기반 mock 증빙을 등록합니다. 하나의 증빙자료는 `indicator_evidence_map` 구조로 여러 지표에 매핑할 수 있습니다.

## Excel 다운로드

브라우저에서 Excel이 열 수 있는 Spreadsheet XML 파일을 생성합니다. 별도 서버 없이 다음 파일을 다운로드할 수 있습니다.

- `performance_summary_YYYY.xls`
- `evidence_checklist_YYYY.xls`
- `kpass_input_YYYY.xls`

## 향후 보완사항

- PostgreSQL 또는 운영 DB 테이블로 persistence 이전
- 관리자 인증과 권한 분리
- 실제 파일스토리지 연동 및 바이러스 검사
- K-PASS, 학사정보, 전자결재 등 외부 시스템 API 계약
- 개인정보 최소수집, 암호화, 접근 로그 정책 적용
