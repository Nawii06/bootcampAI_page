from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "build_integrated_spec.py"

HELPER = r'''

def domain_chapter(number, title, status, purpose, actors, features, data_items, controls, current_gap, prefix):
    requirements = [
        f"{title}에서 {item} 기능을 제공해야 한다." for item in features[:4]
    ] + list(controls[:4])
    chapters.append(Chapter(str(number), title, status, [
        SectionBlock('목적 및 범위', paragraphs=[p(purpose)]),
        SectionBlock('주요 사용자', bullets=list(actors)),
        SectionBlock('주요 기능', bullets=list(features)),
        SectionBlock('주요 데이터', bullets=list(data_items)),
        SectionBlock('업무·통제 규칙', bullets=list(controls)),
        SectionBlock('현재 구현상태', table=status_table(
            status,
            current_gap,
            '요구사항·코드·API·DB·시험·운영 증적을 연결하여 검증한다.',
        )),
        chapter_common_requirements(prefix, requirements, status),
    ]))

'''

REPAIRED_CHAPTERS = r'''chapters.append(Chapter('4', '전체 메뉴구조', 'PARTIAL', [
    SectionBlock('정보구조 원칙', bullets=['공개·학생·기업·관리자 포털의 목적과 탐색구조를 분리한다.', '메뉴 노출과 직접 URL 접근권한을 동일한 정책원천에서 관리한다.', '상위 메뉴와 하위 상세경로의 활성상태가 중복되지 않도록 Canonical Route를 지정한다.', '모바일·접근성·Breadcrumb를 공통 적용한다.']),
    SectionBlock('최상위 메뉴', table=TableBlock(['포털', '최상위 메뉴'], [
        ['공개', '홈 / 사업소개 / 교육과정 / 모집·참여 / 참여기업 / 성과·소식 / 자료실'],
        ['학생', '대시보드 / 프로그램 / 학습활동 / 이수현황 / 수혜현황 / 포트폴리오 / 내 정보'],
        ['기업', '대시보드 / 참여신청 / 기업정보 / 확약·활동 / 프로젝트 / 평가·채용 / 알림'],
        ['관리자', '대시보드 / 교육 / 수혜 / 기업 / 예산 / 성과 / CMS / 파일 / 감사 / 시스템'],
    ], [3.0, 13.5])),
    SectionBlock('라우팅 기준', bullets=['공개: /, /about, /curriculum, /programs, /companies, /performance, /content', '학생: /student/*', '기업: /partner/*', '관리자: /admin/*', '시스템 상태: /api/healthz, /api/readyz, /api/metrics', '업무 API: /api/v1/*']),
    SectionBlock('관리원칙', paragraphs=[p('메뉴는 역할별로 숨기더라도 API는 독립적으로 권한을 재검증해야 한다. 상세화면과 감사로그 Deep Link는 동일한 리소스 식별자를 사용하고, 폐기 라우트는 대체경로와 종료일을 제공해야 한다.')]),
    chapter_common_requirements('NAV', [
        '공개·학생·기업·관리자 포털의 메뉴와 라우트를 분리해야 한다.',
        '메뉴 노출과 직접 URL 접근권한을 동일한 정책으로 검증해야 한다.',
        'Canonical Route와 Breadcrumb를 일관되게 제공해야 한다.',
        '감사 Deep Link는 리소스 ID와 권한범위를 보존해야 한다.',
        '폐기 라우트는 대체경로와 종료일을 관리해야 한다.',
    ]),
]))

domain_chapter(5, '공개 홈페이지 화면 명세', 'PARTIAL',
    '사업소개, 교육과정, 모집·참여, 참여기업, 성과·소식 및 자료를 비로그인 이용자에게 접근성 있게 제공하고 승인된 공개정보만 노출한다.',
    ['PUBLIC', 'CONTENT_EDITOR', 'REVIEWER', 'AUDITOR'],
    ['홈·핵심지표', '사업소개·추진체계', '교육과정·프로그램', '모집공고·신청안내', '참여기업 공개목록', '성과·뉴스·공지·자료실', '공개 포트폴리오'],
    ['content_items', 'content_versions', 'content_attachments', 'programs', 'companies', 'performance_results', 'stored_files'],
    ['공개 승인된 상태만 노출한다.', '개인정보와 비공개 증빙을 노출하지 않는다.', '콘텐츠·첨부파일의 공개상태를 함께 회수한다.', '접근성·검색·모바일 기준을 적용한다.'],
    '공개 기본화면과 콘텐츠 조회는 존재하지만 상세 콘텐츠 유형, 검색, 공개 첨부파일, 접근성 검증과 성과 공개승인 연계가 미완료이다.', 'PUB')

'''


def repair(source: str) -> str:
    marker = "# ---------------------------------------------------------------------------\n# Core chapters"
    if "def domain_chapter(" not in source:
        source = source.replace(marker, HELPER + marker, 1)

    start = source.index("chapters.append(Chapter('4', '전체 메뉴구조'")
    next_domain = source.index("    domain_chapter(6,", start)
    source = source[:start] + REPAIRED_CHAPTERS + source[next_domain:]
    source = source.replace("\n    domain_chapter(", "\ndomain_chapter(")
    source = source.replace(
        "\n])\n\n# ---------------------------------------------------------------------------\n# Appendices",
        "\n\n# ---------------------------------------------------------------------------\n# Appendices",
        1,
    )
    source = source.replace(
        "OUT = Path('/mnt/data')",
        "OUT = Path('docs/integrated-platform-spec-v0.9.0')",
    )
    return source


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    repaired = repair(source)
    SOURCE.write_text(repaired, encoding="utf-8")


if __name__ == "__main__":
    main()
