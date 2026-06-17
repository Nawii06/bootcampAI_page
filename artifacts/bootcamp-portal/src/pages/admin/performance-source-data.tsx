import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { sourceCompaniesSeed, sourceEmploymentsSeed, sourceProgramsSeed, sourceStudentsSeed } from "@/performance/seedData";

export default function AdminPerformanceSourceData() {
  const students = sourceStudentsSeed.map((row) => ({ ...row, id: row.student_id }));
  const companies = sourceCompaniesSeed.map((row) => ({ ...row, id: row.company_id }));
  const programs = sourceProgramsSeed.map((row) => ({ ...row, id: row.program_id }));
  const employments = sourceEmploymentsSeed.map((row) => ({ ...row, id: row.employment_id }));

  return (
    <PortalLayout>
      <SectionHeader title="연동 기초 데이터" description="학생·기업·교육프로그램·취업 데이터와 성과지표를 연결하기 위한 seed 구조입니다." />
      <div className="space-y-8">
        <section>
          <h3 className="font-semibold mb-3">학생 데이터</h3>
          <DataTable data={students} columns={[
            { key: "student_id", header: "student_id" },
            { key: "department", header: "department" },
            { key: "program_level", header: "program_level" },
            { key: "completion_status", header: "completion_status" },
            { key: "employment_status", header: "employment_status" }
          ] as ColumnDef<(typeof students)[number]>[]} />
        </section>
        <section>
          <h3 className="font-semibold mb-3">기업 데이터</h3>
          <DataTable data={companies} columns={[
            { key: "company_id", header: "company_id" },
            { key: "company_name", header: "company_name" },
            { key: "industry", header: "industry" },
            { key: "participation_type", header: "participation_type" }
          ] as ColumnDef<(typeof companies)[number]>[]} />
        </section>
        <section>
          <h3 className="font-semibold mb-3">교육프로그램 데이터</h3>
          <DataTable data={programs} columns={[
            { key: "program_id", header: "program_id" },
            { key: "program_name", header: "program_name" },
            { key: "program_type", header: "program_type" },
            { key: "participants", header: "participants" },
            { key: "completers", header: "completers" }
          ] as ColumnDef<(typeof programs)[number]>[]} />
        </section>
        <section>
          <h3 className="font-semibold mb-3">취업 데이터</h3>
          <DataTable data={employments} columns={[
            { key: "employment_id", header: "employment_id" },
            { key: "student_id", header: "student_id" },
            { key: "company_name", header: "company_name" },
            { key: "is_partner_company", header: "is_partner_company" },
            { key: "is_linked_employment", header: "is_linked_employment" }
          ] as ColumnDef<(typeof employments)[number]>[]} />
        </section>
      </div>
    </PortalLayout>
  );
}
