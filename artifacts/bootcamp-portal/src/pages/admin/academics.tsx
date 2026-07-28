import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  CourseListResponseSchema,
  CourseOfferingListResponseSchema,
  CurriculumListResponseSchema,
  CurriculumRequirementListResponseSchema,
  TermListResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorCard } from "@/components/ErrorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useFormDraft } from "@/hooks/useFormDraft";

const request = <T,>(url: string, options?: RequestInit) =>
  customFetch<T>(url, { responseType: "json", credentials: "include", ...options });

export default function AdminAcademics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseEnglishName, setCourseEnglishName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [departmentCode, setDepartmentCode] = useState("AI_BOOTCAMP");
  const [sourceSystem, setSourceSystem] = useState("");
  const [externalId, setExternalId] = useState("");
  const [credits, setCredits] = useState("3");
  const [editingCourseId, setEditingCourseId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [editingOfferingId, setEditingOfferingId] = useState("");
  const [sectionCode, setSectionCode] = useState("01");
  const [capacity, setCapacity] = useState("30");
  const [instructorName, setInstructorName] = useState("");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumName, setCurriculumName] = useState("");
  const [editingCurriculumId, setEditingCurriculumId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState("");
  const [selectedCurriculumId, setSelectedCurriculumId] = useState("");
  const [editingRequirementId, setEditingRequirementId] = useState("");
  const [requirementCode, setRequirementCode] = useState("");
  const [requirementName, setRequirementName] = useState("");
  const [requirementType, setRequirementType] = useState("TOTAL_CREDITS");
  const [requirementOperator, setRequirementOperator] = useState("GTE");
  const [requiredValue, setRequiredValue] = useState("3");
  const [requirementUnit, setRequirementUnit] = useState("학점");

  // ── Draft persistence (one instance per form section) ───────────────────
  const { clearDraft: clearCourseDraft } = useFormDraft(
    "admin/academics/course",
    { courseCode, courseName, courseEnglishName, courseDescription, departmentCode, sourceSystem, externalId, credits, editingCourseId },
    (draft) => {
      if (draft.courseCode) setCourseCode(draft.courseCode);
      if (draft.courseName) setCourseName(draft.courseName);
      if (draft.courseEnglishName) setCourseEnglishName(draft.courseEnglishName);
      if (draft.courseDescription) setCourseDescription(draft.courseDescription);
      if (draft.departmentCode) setDepartmentCode(draft.departmentCode);
      if (draft.sourceSystem) setSourceSystem(draft.sourceSystem);
      if (draft.externalId) setExternalId(draft.externalId);
      if (draft.credits) setCredits(draft.credits);
      if (draft.editingCourseId) setEditingCourseId(draft.editingCourseId);
    },
    (clear, info) => {
      const draftAgeDays = Math.floor(info.draftAgeMs / (24 * 60 * 60 * 1000));
      toast({
        title: "이전에 작성 중이던 내용을 불러왔습니다",
        ...(info.isNearExpiry
          ? {
              description: `${draftAgeDays}일 전에 저장된 임시저장본입니다. 24시간 내에 만료되니 지금 제출하거나 내용을 수정해 다시 저장해 주세요.`,
              className: "border-yellow-500 bg-yellow-50 text-yellow-900",
            }
          : {}),
        action: (
          <ToastAction
            altText="초기화"
            onClick={() => {
              clear();
              setCourseCode(""); setCourseName(""); setCourseEnglishName("");
              setCourseDescription(""); setDepartmentCode("AI_BOOTCAMP");
              setSourceSystem(""); setExternalId(""); setCredits("3");
              setEditingCourseId("");
            }}
          >
            초기화
          </ToastAction>
        ),
      });
    },
  );

  const { clearDraft: clearOfferingDraft } = useFormDraft(
    "admin/academics/offering",
    { sectionCode, capacity, instructorName, editingOfferingId },
    (draft) => {
      if (draft.sectionCode) setSectionCode(draft.sectionCode);
      if (draft.capacity) setCapacity(draft.capacity);
      if (draft.instructorName) setInstructorName(draft.instructorName);
      if (draft.editingOfferingId) setEditingOfferingId(draft.editingOfferingId);
    },
    (clear, info) => {
      const draftAgeDays = Math.floor(info.draftAgeMs / (24 * 60 * 60 * 1000));
      toast({
        title: "이전에 작성 중이던 내용을 불러왔습니다",
        ...(info.isNearExpiry
          ? {
              description: `${draftAgeDays}일 전에 저장된 임시저장본입니다. 24시간 내에 만료되니 지금 제출하거나 내용을 수정해 다시 저장해 주세요.`,
              className: "border-yellow-500 bg-yellow-50 text-yellow-900",
            }
          : {}),
        action: (
          <ToastAction
            altText="초기화"
            onClick={() => {
              clear();
              setSectionCode("01"); setCapacity("30"); setInstructorName("");
              setEditingOfferingId("");
            }}
          >
            초기화
          </ToastAction>
        ),
      });
    },
  );

  const { clearDraft: clearCurriculumDraft } = useFormDraft(
    "admin/academics/curriculum",
    { curriculumCode, curriculumName, effectiveFrom, effectiveTo, editingCurriculumId },
    (draft) => {
      if (draft.curriculumCode) setCurriculumCode(draft.curriculumCode);
      if (draft.curriculumName) setCurriculumName(draft.curriculumName);
      if (draft.effectiveFrom) setEffectiveFrom(draft.effectiveFrom);
      if (draft.effectiveTo) setEffectiveTo(draft.effectiveTo);
      if (draft.editingCurriculumId) setEditingCurriculumId(draft.editingCurriculumId);
    },
    (clear, info) => {
      const draftAgeDays = Math.floor(info.draftAgeMs / (24 * 60 * 60 * 1000));
      toast({
        title: "이전에 작성 중이던 내용을 불러왔습니다",
        ...(info.isNearExpiry
          ? {
              description: `${draftAgeDays}일 전에 저장된 임시저장본입니다. 24시간 내에 만료되니 지금 제출하거나 내용을 수정해 다시 저장해 주세요.`,
              className: "border-yellow-500 bg-yellow-50 text-yellow-900",
            }
          : {}),
        action: (
          <ToastAction
            altText="초기화"
            onClick={() => {
              clear();
              setCurriculumCode(""); setCurriculumName("");
              setEffectiveFrom(new Date().toISOString().slice(0, 10));
              setEffectiveTo(""); setEditingCurriculumId("");
            }}
          >
            초기화
          </ToastAction>
        ),
      });
    },
  );

  const { clearDraft: clearRequirementDraft } = useFormDraft(
    "admin/academics/requirement",
    { requirementCode, requirementName, requirementType, requirementOperator, requiredValue, requirementUnit, editingRequirementId },
    (draft) => {
      if (draft.requirementCode) setRequirementCode(draft.requirementCode);
      if (draft.requirementName) setRequirementName(draft.requirementName);
      if (draft.requirementType) setRequirementType(draft.requirementType);
      if (draft.requirementOperator) setRequirementOperator(draft.requirementOperator);
      if (draft.requiredValue) setRequiredValue(draft.requiredValue);
      if (draft.requirementUnit) setRequirementUnit(draft.requirementUnit);
      if (draft.editingRequirementId) setEditingRequirementId(draft.editingRequirementId);
    },
    (clear, info) => {
      const draftAgeDays = Math.floor(info.draftAgeMs / (24 * 60 * 60 * 1000));
      toast({
        title: "이전에 작성 중이던 내용을 불러왔습니다",
        ...(info.isNearExpiry
          ? {
              description: `${draftAgeDays}일 전에 저장된 임시저장본입니다. 24시간 내에 만료되니 지금 제출하거나 내용을 수정해 다시 저장해 주세요.`,
              className: "border-yellow-500 bg-yellow-50 text-yellow-900",
            }
          : {}),
        action: (
          <ToastAction
            altText="초기화"
            onClick={() => {
              clear();
              setRequirementCode(""); setRequirementName("");
              setRequirementType("TOTAL_CREDITS"); setRequirementOperator("GTE");
              setRequiredValue("3"); setRequirementUnit("학점");
              setEditingRequirementId("");
            }}
          >
            초기화
          </ToastAction>
        ),
      });
    },
  );

  const years = useQuery({
    queryKey: ["reference", "business-years"],
    queryFn: () => contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years"),
  });
  const yearId = years.data?.data[0]?.id;
  const terms = useQuery({
    queryKey: ["reference", "terms", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(TermListResponseSchema, `/api/v1/reference/terms?businessYearId=${yearId}`),
  });
  const courses = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => contractFetch(CourseListResponseSchema, "/api/v1/courses?page=1&pageSize=100"),
  });
  const offerings = useQuery({
    queryKey: ["admin", "course-offerings", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(CourseOfferingListResponseSchema, `/api/v1/course-offerings?businessYearId=${yearId}`),
  });
  const curricula = useQuery({
    queryKey: ["admin", "curricula", yearId],
    enabled: Boolean(yearId),
    queryFn: () => contractFetch(
      CurriculumListResponseSchema,
      `/api/v1/curricula?businessYearId=${yearId}`,
      { credentials: "include" },
    ),
  });
  const requirements = useQuery({
    queryKey: ["admin", "curriculum-requirements", selectedCurriculumId],
    enabled: Boolean(selectedCurriculumId),
    queryFn: () => contractFetch(
      CurriculumRequirementListResponseSchema,
      `/api/v1/curricula/${selectedCurriculumId}/requirements`,
      { credentials: "include" },
    ),
  });

  useEffect(() => {
    if (!selectedTermId && terms.data?.data[0]) setSelectedTermId(terms.data.data[0].id);
  }, [selectedTermId, terms.data]);
  useEffect(() => {
    if (!selectedCourseId && courses.data?.data[0]) setSelectedCourseId(courses.data.data[0].id);
  }, [selectedCourseId, courses.data]);
  useEffect(() => {
    if (!selectedCurriculumId && curricula.data?.data[0]) setSelectedCurriculumId(curricula.data.data[0].id);
  }, [selectedCurriculumId, curricula.data]);

  const createCourse = useMutation({
    mutationFn: () => request(editingCourseId ? `/api/v1/courses/${editingCourseId}` : "/api/v1/courses", {
      method: editingCourseId ? "PATCH" : "POST",
      body: JSON.stringify({
        courseCode, name: courseName, defaultCredits: Number(credits),
        englishName: courseEnglishName || undefined,
        description: courseDescription || undefined,
        departmentCode: departmentCode || undefined,
        sourceSystem: sourceSystem || undefined,
        externalId: externalId || undefined,
      }),
    }),
    onSuccess: () => {
      clearCourseDraft();
      setCourseCode(""); setCourseName(""); setCourseEnglishName(""); setCourseDescription("");
      setSourceSystem(""); setExternalId(""); setEditingCourseId("");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });
  const createOffering = useMutation({
    mutationFn: () => request(editingOfferingId ? `/api/v1/course-offerings/${editingOfferingId}` : "/api/v1/course-offerings", {
      method: editingOfferingId ? "PATCH" : "POST",
      body: JSON.stringify({
        ...(editingOfferingId ? {} : { courseMasterId: selectedCourseId, businessYearId: yearId }),
        termId: selectedTermId, sectionCode, credits: Number(credits),
        capacity: Number(capacity), instructorName: instructorName || undefined,
      }),
    }),
    onSuccess: () => {
      clearOfferingDraft();
      setEditingOfferingId(""); setSectionCode("01"); setCapacity("30"); setInstructorName("");
      queryClient.invalidateQueries({ queryKey: ["admin", "course-offerings"] });
    },
  });
  const createCurriculum = useMutation({
    mutationFn: () => request(editingCurriculumId ? `/api/v1/curricula/${editingCurriculumId}` : "/api/v1/curricula", {
      method: editingCurriculumId ? "PATCH" : "POST",
      body: JSON.stringify({
        ...(editingCurriculumId ? {} : { businessYearId: yearId, code: curriculumCode, isPublished: false }),
        name: curriculumName,
        effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString(),
        ...(effectiveTo
          ? { effectiveTo: new Date(`${effectiveTo}T23:59:59.999Z`).toISOString() }
          : editingCurriculumId ? { effectiveTo: null } : {}),
      }),
    }),
    onSuccess: () => {
      clearCurriculumDraft();
      setCurriculumCode(""); setCurriculumName(""); setEditingCurriculumId(""); setEffectiveTo("");
      queryClient.invalidateQueries({ queryKey: ["admin", "curricula"] });
    },
  });
  const createRequirement = useMutation({
    mutationFn: () => request(editingRequirementId ? `/api/v1/curriculum-requirements/${editingRequirementId}` : `/api/v1/curricula/${selectedCurriculumId}/requirements`, {
      method: editingRequirementId ? "PATCH" : "POST",
      body: JSON.stringify({
        code: requirementCode || `REQ-${Date.now()}`, name: requirementName,
        requirementType, operator: requirementOperator,
        requiredValue: Number(requiredValue), unit: requirementUnit || undefined,
      }),
    }),
    onSuccess: () => {
      clearRequirementDraft();
      setRequirementName(""); setRequirementCode(""); setEditingRequirementId("");
      queryClient.invalidateQueries({ queryKey: ["admin", "curriculum-requirements", selectedCurriculumId] });
    },
  });
  const changeAcademic = useMutation({
    mutationFn: ({ url, method, body }: { url: string; method: "PATCH" | "DELETE"; body?: unknown }) =>
      request(url, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const mutationError = [createCourse, createOffering, createCurriculum, createRequirement, changeAcademic]
    .find((mutation) => mutation.isError)?.error;

  return (
    <PortalLayout>
      <SectionHeader title="학사·교육과정 관리" description="교과목 마스터, 학기별 개설정보, 교육과정과 이수요건을 DB 기준으로 관리합니다." />
      {(years.isError || courses.isError) && (
        <ErrorCard
          message="학사·교육과정 데이터를 불러오지 못했습니다."
          onRetry={() => { years.refetch(); courses.refetch(); }}
          isRetrying={years.isFetching || courses.isFetching}
          className="mb-6"
        />
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">교과목 마스터</h3>
          <div className="my-4 grid gap-2 sm:grid-cols-5">
            <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="교과목 코드" />
            <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="교과목명" className="sm:col-span-2" />
            <Input type="number" min="0" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="기본학점" />
            <Button disabled={!courseCode || !courseName || createCourse.isPending} onClick={() => createCourse.mutate()}>{editingCourseId ? "저장" : "등록"}</Button>
            <Input value={courseEnglishName} onChange={(e) => setCourseEnglishName(e.target.value)} placeholder="영문 교과목명" className="sm:col-span-2" />
            <Input value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} placeholder="학과 코드" />
            <Input value={sourceSystem} onChange={(e) => setSourceSystem(e.target.value)} placeholder="외부 source" />
            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="외부 ID" />
            <Input value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} placeholder="교과목 설명" className="sm:col-span-5" />
          </div>
          <SimpleTable headers={["코드", "교과목명", "학점", "관리"]} rows={(courses.data?.data ?? []).map((row) => [
            row.courseCode,
            row.name,
            row.defaultCredits,
            <div className="flex gap-1" key={row.id}>
              <Button size="sm" variant="outline" onClick={() => {
                setCourseCode(row.courseCode); setCourseName(row.name); setCredits(String(row.defaultCredits));
                setCourseEnglishName(row.englishName ?? ""); setCourseDescription(row.description ?? "");
                setDepartmentCode(row.departmentCode ?? ""); setSourceSystem(row.sourceSystem ?? "");
                setExternalId(row.externalId ?? "");
                setEditingCourseId(row.id);
              }}>수정</Button>
              <Button size="sm" variant="destructive" onClick={() => changeAcademic.mutate({ url: `/api/v1/courses/${row.id}`, method: "DELETE" })}>보관</Button>
            </div>,
          ])} />
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">연도·학기별 개설정보</h3>
          <div className="my-4 grid gap-2 sm:grid-cols-3">
            <select className="rounded-md border bg-background px-3 text-sm sm:col-span-2" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
              {(courses.data?.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.courseCode} · {row.name}</option>)}
            </select>
            <select className="rounded-md border bg-background px-3 text-sm" value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
              {(terms.data?.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <Input value={sectionCode} onChange={(e) => setSectionCode(e.target.value)} placeholder="분반" />
            <Input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="정원" />
            <Input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} placeholder="담당교수" />
            <Input type="number" min="0" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="학점" />
            <Button className="sm:col-span-2" disabled={!yearId || !selectedCourseId || !selectedTermId || !sectionCode || Number(capacity) < 1 || createOffering.isPending} onClick={() => createOffering.mutate()}>
              {editingOfferingId ? "개설정보 저장" : "개설"}
            </Button>
          </div>
          <SimpleTable headers={["교과목", "학기", "분반", "학점", "관리"]} rows={(offerings.data?.data ?? []).map((row) => [
            row.courseName, row.termName, row.sectionCode, row.credits,
            <div className="flex gap-1" key={row.id}>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingOfferingId(row.id); setSelectedCourseId(row.courseMasterId);
                setSelectedTermId(row.termId); setSectionCode(row.sectionCode);
                setCredits(String(row.credits)); setCapacity(String(row.capacity ?? 30));
                setInstructorName(row.instructorName ?? "");
              }}>수정</Button>
              <Button size="sm" variant="destructive" onClick={() => changeAcademic.mutate({ url: `/api/v1/course-offerings/${row.id}`, method: "DELETE" })}>보관</Button>
            </div>,
          ])} />
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">교육과정</h3>
          <div className="my-4 grid gap-2 sm:grid-cols-3">
            <Input value={curriculumCode} onChange={(e) => setCurriculumCode(e.target.value)} placeholder="과정 코드" />
            <Input value={curriculumName} onChange={(e) => setCurriculumName(e.target.value)} placeholder="교육과정명" className="sm:col-span-2" />
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
            <Button disabled={!yearId || (!editingCurriculumId && !curriculumCode) || !curriculumName || !effectiveFrom || createCurriculum.isPending} onClick={() => createCurriculum.mutate()}>
              {editingCurriculumId ? "과정 저장" : "생성"}
            </Button>
          </div>
          <SimpleTable headers={["코드", "교육과정", "버전", "상태", "관리"]} rows={(curricula.data?.data ?? []).map((row) => [
            row.code, row.name, row.version, row.isPublished ? "게시" : "초안",
            <div className="flex gap-1" key={row.id}>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingCurriculumId(row.id); setCurriculumCode(row.code); setCurriculumName(row.name);
                setEffectiveFrom(row.effectiveFrom.slice(0, 10)); setEffectiveTo(row.effectiveTo?.slice(0, 10) ?? "");
              }}>수정</Button>
              <Button size="sm" variant="outline" disabled={row.isPublished} onClick={() => changeAcademic.mutate({ url: `/api/v1/curricula/${row.id}`, method: "PATCH", body: { isPublished: true } })}>게시</Button>
              <Button size="sm" variant="destructive" onClick={() => changeAcademic.mutate({ url: `/api/v1/curricula/${row.id}`, method: "DELETE" })}>보관</Button>
            </div>,
          ])} />
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">이수요건</h3>
          <select className="my-4 h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedCurriculumId} onChange={(e) => setSelectedCurriculumId(e.target.value)}>
            {(curricula.data?.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
          </select>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <Input value={requirementCode} onChange={(e) => setRequirementCode(e.target.value)} placeholder="요건 코드" />
            <Input value={requirementName} onChange={(e) => setRequirementName(e.target.value)} placeholder="요건명" />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={requirementType} onChange={(e) => setRequirementType(e.target.value)}>
              <option value="TOTAL_CREDITS">총 학점</option><option value="EXTRACURRICULAR_HOURS">비교과 시간</option>
              <option value="PROJECT">프로젝트</option><option value="FIELD_PRACTICE">현장실습</option><option value="INTERNSHIP">인턴십</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={requirementOperator} onChange={(e) => setRequirementOperator(e.target.value)}>
              <option value="GTE">이상</option><option value="LTE">이하</option><option value="EQ">동일</option>
            </select>
            <Input type="number" value={requiredValue} onChange={(e) => setRequiredValue(e.target.value)} placeholder="기준학점" />
            <Input value={requirementUnit} onChange={(e) => setRequirementUnit(e.target.value)} placeholder="단위" />
            <Button className="sm:col-span-3" disabled={!selectedCurriculumId || !requirementName || !requiredValue || createRequirement.isPending} onClick={() => createRequirement.mutate()}>
              {editingRequirementId ? "요건 저장" : "요건 추가"}
            </Button>
          </div>
          <SimpleTable headers={["코드", "요건", "유형", "기준", "관리"]} rows={(requirements.data?.data ?? []).map((row) => [
            row.code, row.name, row.requirementType, `${row.operator} ${row.requiredValue ?? "-"}`,
            <div className="flex gap-1" key={row.id}>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingRequirementId(row.id); setRequirementCode(row.code); setRequirementName(row.name);
                setRequirementType(row.requirementType); setRequirementOperator(row.operator);
                setRequiredValue(String(row.requiredValue ?? "")); setRequirementUnit(row.unit ?? "");
              }}>수정</Button>
              <Button size="sm" variant="destructive" onClick={() => changeAcademic.mutate({ url: `/api/v1/curriculum-requirements/${row.id}`, method: "DELETE" })}>보관</Button>
            </div>,
          ])} />
        </section>
      </div>
      {mutationError && <p className="mt-4 text-sm text-destructive">{mutationError.message}</p>}
    </PortalLayout>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-left">{header}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-t">{row.map((value, cell) => <td key={cell} className="px-3 py-2">{value}</td>)}</tr>) : <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={headers.length}>등록된 데이터가 없습니다.</td></tr>}</tbody>
      </table>
    </div>
  );
}
