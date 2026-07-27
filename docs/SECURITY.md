# 보안 기준

- 인증·인가 실패는 각각 401/403으로 구분하고 서버에서 판정한다.
- CORS는 운영 허용 origin 목록만 사용하고 credential 정책을 명시한다.
- session cookie는 `HttpOnly`, `Secure`, `SameSite`를 설정한다.
- 업로드는 실행 불가능한 비공개 저장소에 두며 다운로드도 권한검사를 거친다.
- 로그와 audit에는 비밀번호, 토큰, 계좌번호, 전체 주민번호를 기록하지 않는다.
- 개인정보 export는 목적과 필터를 기록하고 결과 파일에 만료시간을 둔다.
- rate limit, body size limit, 보안 header, CSRF 방어를 운영 구성에 포함한다.
- `NODE_ENV=production`에서는 mock 사용자·mock login endpoint를 등록하지 않는다.
- migration 권한과 애플리케이션 runtime DB 권한을 분리한다.

배포 전 필수 검증은 역할별 API 접근 matrix, IDOR, 대량할당, 파일 위장, SQL injection,
XSS, session 고정, 개인정보 audit 누락 여부다.
