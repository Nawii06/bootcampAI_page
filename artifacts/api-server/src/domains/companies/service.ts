import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  companies,
  companyApplications,
  companyContacts,
  companyParticipations,
} from "@workspace/db/schema";
import type {
  CompanyApplicationDecision,
  CompanyApplicationInput,
  CompanyParticipationInput,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import { lockCompanyApplication } from "./repository";

export function submitCompanyApplication(
  input: CompanyApplicationInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [application] = await tx
      .insert(companyApplications)
      .values({
        businessYearId: input.businessYearId,
        applicantUserId: actorId,
        companyName: input.companyName,
        registrationNumber: input.registrationNumber,
        applicationData: input,
        status: "SUBMITTED",
        submittedAt: new Date(),
      })
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "SUBMIT",
      resourceType: "COMPANY_APPLICATION",
      resourceId: application?.id,
      businessYearId: input.businessYearId,
      requestId,
      after: {
        companyName: input.companyName,
        participationTypes: input.participationTypes,
      },
    });
    return application;
  });
}

export function decideCompanyApplication(
  id: string,
  decision: CompanyApplicationDecision,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [application] = await lockCompanyApplication(tx, id);
    if (!application) {
      throw new ApiError(404, "COMPANY_APPLICATION_NOT_FOUND", "기업 신청서를 찾을 수 없습니다.");
    }
    if (!["SUBMITTED", "REVIEWING", "SUPPLEMENT_REQUESTED"].includes(application.status)) {
      throw new ApiError(409, "COMPANY_APPLICATION_FINALIZED", "이미 처리가 완료된 신청입니다.");
    }
    const [updated] = await tx
      .update(companyApplications)
      .set({
        status: decision.decision,
        supplementRequest:
          decision.decision === "SUPPLEMENT_REQUESTED" ? decision.note : null,
        reviewedBy: actorId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(companyApplications.id, id))
      .returning();

    let company: typeof companies.$inferSelect | undefined;
    if (decision.decision === "APPROVED") {
      const data = application.applicationData as unknown as CompanyApplicationInput;
      [company] = await tx
        .insert(companies)
        .values({
          approvedApplicationId: application.id,
          name: data.companyName,
          registrationNumber: data.registrationNumber,
          companyType: data.companyType,
          description: data.description,
          website: data.website,
          isActive: true,
          isPublic: false,
        })
        .returning();
      if (!company) {
        throw new ApiError(500, "COMPANY_CREATE_FAILED", "기업 마스터를 생성하지 못했습니다.");
      }
      await tx.insert(companyContacts).values({
        companyId: company.id,
        ...data.contact,
        isPrimary: true,
      });
    }

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: decision.decision,
      resourceType: "COMPANY_APPLICATION",
      resourceId: id,
      businessYearId: application.businessYearId,
      requestId,
      before: { status: application.status },
      after: { status: decision.decision, note: decision.note },
      metadata: company ? { companyId: company.id } : {},
    });
    return { application: updated, company };
  });
}

export function createCompanyParticipation(
  input: CompanyParticipationInput,
  companyId: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [participation] = await tx
      .insert(companyParticipations)
      .values({
        companyId,
        businessYearId: input.businessYearId,
        participationType: input.participationType,
        title: input.title,
        details: input.details,
        participantCount: input.participantCount,
        employmentCount: input.employmentCount,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      })
      .returning();
    if (!participation) {
      throw new ApiError(500, "COMPANY_PARTICIPATION_CREATE_FAILED", "기업 참여활동을 저장하지 못했습니다.");
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "COMPANY_PARTICIPATION",
      resourceId: participation.id,
      businessYearId: input.businessYearId,
      requestId,
      after: {
        companyId,
        participationType: input.participationType,
        title: input.title,
      },
    });
    return participation;
  });
}
