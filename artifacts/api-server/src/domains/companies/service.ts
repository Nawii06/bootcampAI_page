import { and, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  companies,
  companyApplications,
  companyContacts,
  companyCommitments,
  companyExperts,
  companyParticipations,
} from "@workspace/db/schema";
import type {
  CompanyApplicationDecision,
  CompanyApplicationInput,
  CompanyParticipationInput,
  CompanyParticipationUpdate,
  CompanyCommitmentInput,
  CompanyContactInput,
  CompanyExpertInput,
  CompanyMasterUpdate,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import { lockCompanyApplication, listConsentedProjectPortfolios } from "./repository";

export function updateCompanyMaster(id: string, input: CompanyMasterUpdate, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt))).for("update");
    if (!current) throw new ApiError(404, "COMPANY_NOT_FOUND", "기업정보를 찾을 수 없습니다.");
    const [updated] = await tx.update(companies).set({ ...input, updatedAt: new Date() })
      .where(eq(companies.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "UPDATE", resourceType: "COMPANY",
      resourceId: id, requestId, before: current, after: updated,
      changedFields: Object.keys(input),
    });
    return updated;
  });
}

export function createCompanyContact(companyId: string, input: CompanyContactInput, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [company] = await tx.select({ id: companies.id }).from(companies)
      .where(and(eq(companies.id, companyId), isNull(companies.deletedAt))).for("update");
    if (!company) throw new ApiError(404, "COMPANY_NOT_FOUND", "기업정보를 찾을 수 없습니다.");
    if (input.isPrimary) {
      await tx.update(companyContacts).set({ isPrimary: false }).where(
        and(eq(companyContacts.companyId, companyId), isNull(companyContacts.deletedAt)),
      );
    }
    const [contact] = await tx.insert(companyContacts).values({ companyId, ...input }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "CREATE", resourceType: "COMPANY_CONTACT",
      resourceId: contact?.id, requestId, after: contact,
    });
    return contact;
  });
}

export function archiveCompanyContact(id: string, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(companyContacts)
      .where(and(eq(companyContacts.id, id), isNull(companyContacts.deletedAt))).for("update");
    if (!current) throw new ApiError(404, "COMPANY_CONTACT_NOT_FOUND", "기업 담당자를 찾을 수 없습니다.");
    const [archived] = await tx.update(companyContacts).set({ isPrimary: false, deletedAt: new Date() })
      .where(eq(companyContacts.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "ARCHIVE", resourceType: "COMPANY_CONTACT",
      resourceId: id, requestId, before: current, after: archived,
    });
    return archived;
  });
}

export function createCompanyExpert(companyId: string, input: CompanyExpertInput, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [company] = await tx.select({ id: companies.id }).from(companies)
      .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)));
    if (!company) throw new ApiError(404, "COMPANY_NOT_FOUND", "기업정보를 찾을 수 없습니다.");
    const [expert] = await tx.insert(companyExperts).values({ companyId, ...input }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "CREATE", resourceType: "COMPANY_EXPERT",
      resourceId: expert?.id, requestId, after: expert,
    });
    return expert;
  });
}

export function updateCompanyExpertStatus(id: string, isActive: boolean, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(companyExperts).where(eq(companyExperts.id, id)).for("update");
    if (!current) throw new ApiError(404, "COMPANY_EXPERT_NOT_FOUND", "기업 전문가를 찾을 수 없습니다.");
    const [updated] = await tx.update(companyExperts).set({ isActive }).where(eq(companyExperts.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "STATUS_CHANGE", resourceType: "COMPANY_EXPERT",
      resourceId: id, requestId, before: { isActive: current.isActive }, after: { isActive },
      changedFields: ["isActive"],
    });
    return updated;
  });
}

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

export function resubmitCompanyApplication(
  id: string,
  input: CompanyApplicationInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [application] = await lockCompanyApplication(tx, id);
    if (!application) throw new ApiError(404, "COMPANY_APPLICATION_NOT_FOUND", "기업 신청서를 찾을 수 없습니다.");
    if (application.applicantUserId !== actorId) {
      throw new ApiError(403, "FORBIDDEN", "본인의 기업 신청서만 수정할 수 있습니다.");
    }
    if (!["DRAFT", "SUPPLEMENT_REQUESTED"].includes(application.status)) {
      throw new ApiError(409, "COMPANY_APPLICATION_NOT_EDITABLE", "보완 가능한 신청서가 아닙니다.");
    }
    const [updated] = await tx.update(companyApplications).set({
      businessYearId: input.businessYearId,
      companyName: input.companyName,
      registrationNumber: input.registrationNumber,
      applicationData: input,
      status: "SUBMITTED",
      supplementRequest: null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(companyApplications.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "RESUBMIT",
      resourceType: "COMPANY_APPLICATION", resourceId: id,
      businessYearId: input.businessYearId, requestId,
      before: { status: application.status, supplementRequest: application.supplementRequest },
      after: { status: "SUBMITTED", companyName: input.companyName },
    });
    return updated;
  });
}

export function upsertCompanyCommitment(
  input: CompanyCommitmentInput,
  companyId: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [commitment] = await tx.insert(companyCommitments).values({
      companyId,
      businessYearId: input.businessYearId,
      fileId: input.fileId,
      signedAt: new Date(input.signedAt),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    }).onConflictDoUpdate({
      target: [companyCommitments.companyId, companyCommitments.businessYearId],
      set: {
        fileId: input.fileId,
        signedAt: new Date(input.signedAt),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "UPSERT",
      resourceType: "COMPANY_COMMITMENT", resourceId: commitment?.id,
      businessYearId: input.businessYearId, requestId,
      after: { companyId, fileId: input.fileId, signedAt: input.signedAt },
    });
    return commitment;
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

export function updateCompanyParticipation(
  id: string,
  /** Owning company's id.  Pass `null` for admin callers to bypass the
   *  ownership check (COMPANY_STAFF / REVIEWER). */
  companyId: string | null,
  input: CompanyParticipationUpdate,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(companyParticipations)
      .where(and(eq(companyParticipations.id, id), isNull(companyParticipations.deletedAt)))
      .for("update");
    if (!current) throw new ApiError(404, "COMPANY_PARTICIPATION_NOT_FOUND", "채용연계 건을 찾을 수 없습니다.");
    if (companyId !== null && current.companyId !== companyId) throw new ApiError(403, "FORBIDDEN", "본인 회사의 채용연계 건만 수정할 수 있습니다.");
    const [updated] = await tx.update(companyParticipations).set({
      ...(input.participationType !== undefined ? { participationType: input.participationType } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.details !== undefined ? { details: input.details } : {}),
      ...(input.participantCount !== undefined ? { participantCount: input.participantCount } : {}),
      ...(input.employmentCount !== undefined ? { employmentCount: input.employmentCount } : {}),
      ...("startsAt" in input ? { startsAt: input.startsAt ? new Date(input.startsAt) : null } : {}),
      ...("endsAt" in input ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
      updatedAt: new Date(),
    }).where(eq(companyParticipations.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "UPDATE",
      resourceType: "COMPANY_PARTICIPATION", resourceId: id,
      businessYearId: current.businessYearId, requestId,
      before: { title: current.title, participationType: current.participationType },
      after: { title: updated?.title, participationType: updated?.participationType },
      changedFields: Object.keys(input),
    });
    return updated;
  });
}

export function deleteCompanyParticipation(
  id: string,
  /** Owning company's id.  Pass `null` for admin callers to bypass the
   *  ownership check (COMPANY_STAFF / REVIEWER). */
  companyId: string | null,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(companyParticipations)
      .where(and(eq(companyParticipations.id, id), isNull(companyParticipations.deletedAt)))
      .for("update");
    if (!current) throw new ApiError(404, "COMPANY_PARTICIPATION_NOT_FOUND", "채용연계 건을 찾을 수 없습니다.");
    if (companyId !== null && current.companyId !== companyId) throw new ApiError(403, "FORBIDDEN", "본인 회사의 채용연계 건만 삭제할 수 있습니다.");
    await tx.update(companyParticipations)
      .set({ deletedAt: new Date() })
      .where(eq(companyParticipations.id, id));
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "DELETE",
      resourceType: "COMPANY_PARTICIPATION", resourceId: id,
      businessYearId: current.businessYearId, requestId,
      before: { title: current.title, participationType: current.participationType },
    });
    return { ok: true };
  });
}

export async function setLinkedStudents(
  id: string,
  companyId: string,
  portfolioIds: string[],
  actorId: string,
  requestId: string,
) {
  // Deduplicate before any DB work
  const uniqueIds = [...new Set(portfolioIds)];

  // Validate every submitted ID against the server-authorised candidate set
  // (consented project portfolios, not soft-deleted). This enforces the same
  // constraint as the picker UI, preventing crafted requests from bypassing
  // student consent expectations.
  if (uniqueIds.length > 0) {
    const validCandidates = await listConsentedProjectPortfolios();
    const validIdSet = new Set(validCandidates.map((c) => c.id));
    const invalid = uniqueIds.filter((pid) => !validIdSet.has(pid));
    if (invalid.length > 0) {
      throw new ApiError(
        400,
        "INVALID_PORTFOLIO_IDS",
        "유효하지 않거나 공개 동의되지 않은 포트폴리오 ID가 포함되어 있습니다.",
      );
    }
  }

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(companyParticipations)
      .where(and(eq(companyParticipations.id, id), isNull(companyParticipations.deletedAt)))
      .for("update");
    if (!current) throw new ApiError(404, "COMPANY_PARTICIPATION_NOT_FOUND", "채용연계 건을 찾을 수 없습니다.");
    if (current.companyId !== companyId) throw new ApiError(403, "FORBIDDEN", "본인 회사의 채용연계 건만 수정할 수 있습니다.");
    const prevDetails = (current.details ?? {}) as Record<string, unknown>;
    const updatedDetails = { ...prevDetails, linkedPortfolioIds: uniqueIds };
    const [updated] = await tx.update(companyParticipations)
      .set({ details: updatedDetails, updatedAt: new Date() })
      .where(eq(companyParticipations.id, id))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "LINK_STUDENTS",
      resourceType: "COMPANY_PARTICIPATION", resourceId: id,
      businessYearId: current.businessYearId, requestId,
      before: { linkedPortfolioIds: prevDetails.linkedPortfolioIds ?? [] },
      after: { linkedPortfolioIds: uniqueIds },
      changedFields: ["linkedPortfolioIds"],
    });
    return updated;
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
