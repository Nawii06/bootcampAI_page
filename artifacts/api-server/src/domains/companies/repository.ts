import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  companies,
  companyContacts,
  companyApplications,
  companyCommitments,
  companyParticipations,
  experientialRecords,
} from "@workspace/db/schema";

export function lockCompanyApplication(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  id: string,
) {
  return transaction
    .select()
    .from(companyApplications)
    .where(eq(companyApplications.id, id))
    .for("update");
}

export function listPublicCompanies() {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      companyType: companies.companyType,
      description: companies.description,
      website: companies.website,
    })
    .from(companies)
    .where(
      and(
        eq(companies.isPublic, true),
        eq(companies.isActive, true),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.name));
}

export function listCompanies() {
  return db.query.companies.findMany({
    where: isNull(companies.deletedAt),
    with: {
      companyContacts: {
        where: isNull(companyContacts.deletedAt),
      },
      companyExperts: true,
      companyParticipations: true,
    },
    orderBy: [asc(companies.name)],
  });
}

export function listCompanyApplications(filters: {
  businessYearId?: string;
  status?: string;
  applicantUserId?: string;
}) {
  return db.select().from(companyApplications).where(and(
    filters.businessYearId
      ? eq(companyApplications.businessYearId, filters.businessYearId)
      : undefined,
    filters.status ? eq(companyApplications.status, filters.status as typeof companyApplications.status.enumValues[number]) : undefined,
    filters.applicantUserId
      ? eq(companyApplications.applicantUserId, filters.applicantUserId)
      : undefined,
    isNull(companyApplications.deletedAt),
  )).orderBy(asc(companyApplications.createdAt));
}

export function listCompanyCommitments() {
  return db.select().from(companyCommitments).orderBy(asc(companyCommitments.signedAt));
}

export async function findCompanyForUser(userId: string) {
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      companyType: companies.companyType,
      isActive: companies.isActive,
    })
    .from(companies)
    .innerJoin(
      companyApplications,
      eq(companyApplications.id, companies.approvedApplicationId),
    )
    .where(
      and(
        eq(companyApplications.applicantUserId, userId),
        eq(companies.isActive, true),
        isNull(companies.deletedAt),
      ),
    );
  return company;
}

export function listCompanyParticipations(
  companyId: string,
  filters: { businessYearId?: string; participationType?: string },
) {
  return db
    .select()
    .from(companyParticipations)
    .where(
      and(
        eq(companyParticipations.companyId, companyId),
        filters.businessYearId
          ? eq(companyParticipations.businessYearId, filters.businessYearId)
          : undefined,
        filters.participationType
          ? eq(
              companyParticipations.participationType,
              filters.participationType,
            )
          : undefined,
        isNull(companyParticipations.deletedAt),
      ),
    )
    .orderBy(asc(companyParticipations.createdAt));
}

/**
 * List all company participations across every company (admin view).
 * Joined with the companies table so each row includes company name and type.
 * Supports optional filters; no companyId ownership restriction.
 */
export function listAllCompanyParticipations(filters: {
  companyId?: string;
  businessYearId?: string;
  participationType?: string;
}) {
  return db
    .select({
      id: companyParticipations.id,
      companyId: companyParticipations.companyId,
      companyName: companies.name,
      companyType: companies.companyType,
      businessYearId: companyParticipations.businessYearId,
      participationType: companyParticipations.participationType,
      title: companyParticipations.title,
      details: companyParticipations.details,
      participantCount: companyParticipations.participantCount,
      employmentCount: companyParticipations.employmentCount,
      startsAt: companyParticipations.startsAt,
      endsAt: companyParticipations.endsAt,
      createdAt: companyParticipations.createdAt,
    })
    .from(companyParticipations)
    .innerJoin(companies, eq(companies.id, companyParticipations.companyId))
    .where(
      and(
        filters.companyId
          ? eq(companyParticipations.companyId, filters.companyId)
          : undefined,
        filters.businessYearId
          ? eq(companyParticipations.businessYearId, filters.businessYearId)
          : undefined,
        filters.participationType
          ? eq(
              companyParticipations.participationType,
              filters.participationType,
            )
          : undefined,
        isNull(companyParticipations.deletedAt),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.name), asc(companyParticipations.createdAt));
}

/** All PROJECT-type experiential records for a given student (not soft-deleted). */
export function listStudentPortfolios(studentId: string) {
  return db
    .select({ id: experientialRecords.id })
    .from(experientialRecords)
    .where(
      and(
        eq(experientialRecords.studentId, studentId),
        eq(experientialRecords.type, "PROJECT"),
        isNull(experientialRecords.deletedAt),
      ),
    );
}

/**
 * Return all non-deleted company participations whose details.linkedPortfolioIds
 * contains at least one of the supplied portfolio IDs, joined with company info.
 */
export async function listParticipationsForPortfolio(portfolioIds: string[]) {
  if (portfolioIds.length === 0) return [];
  return db
    .select({
      id: companyParticipations.id,
      companyName: companies.name,
      companyType: companies.companyType,
      participationType: companyParticipations.participationType,
      title: companyParticipations.title,
      startsAt: companyParticipations.startsAt,
      endsAt: companyParticipations.endsAt,
      createdAt: companyParticipations.createdAt,
    })
    .from(companyParticipations)
    .innerJoin(companies, eq(companies.id, companyParticipations.companyId))
    .where(
      and(
        isNull(companyParticipations.deletedAt),
        isNull(companies.deletedAt),
        // Use JSONB @> (contains) operator: checks if linkedPortfolioIds array
        // contains any of the student's portfolio IDs.
        or(
          ...portfolioIds.map(
            (pid) =>
              sql`${companyParticipations.details}->'linkedPortfolioIds' @> ${JSON.stringify([pid])}::jsonb`,
          ),
        ),
      ),
    )
    .orderBy(asc(companyParticipations.createdAt));
}

export function listConsentedProjectPortfolios() {
  return db
    .select({
      id: experientialRecords.id,
      studentId: experientialRecords.studentId,
      title: experientialRecords.title,
      evidence: experientialRecords.evidence,
      status: experientialRecords.status,
      createdAt: experientialRecords.createdAt,
    })
    .from(experientialRecords)
    .where(
      and(
        eq(experientialRecords.type, "PROJECT"),
        sql`${experientialRecords.evidence}->>'publicConsent' = 'true'`,
        isNull(experientialRecords.deletedAt),
      ),
    )
    .orderBy(asc(experientialRecords.createdAt));
}
