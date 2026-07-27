import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const command = process.argv[2];
const dataSetId = process.argv[3];
const root = path.resolve(
  import.meta.dirname,
  "..",
  "artifacts",
  "bootcamp-portal",
  "fake-data",
);

if (command === "list") {
  const files = await readdir(root);
  console.log(files.filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)).join("\n"));
  process.exit(0);
}

if (command === "validate" && dataSetId) {
  if (!/^FD_Set_[0-9]{2}$/.test(dataSetId)) throw new Error("Invalid fake data set id.");
  const fixture = JSON.parse(await readFile(path.resolve(root, `${dataSetId}.json`), "utf8"));
  const errors = [];
  const roles = new Set(["PUBLIC","STUDENT","COMPANY_APPLICANT","COMPANY_MANAGER","EDUCATION_STAFF","BENEFIT_STAFF","COMPANY_STAFF","BUDGET_STAFF","PERFORMANCE_STAFF","CONTENT_EDITOR","REVIEWER","SYSTEM_ADMIN","AUDITOR"]);
  const routes = new Set(["/student/dashboard","/student/completion","/partner/dashboard","/admin/dashboard","/admin/partners","/admin/budget","/admin/performance"]);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const users = new Set(fixture.users.map((item) => item.id));
  const students = new Set(fixture.students.map((item) => item.id));
  const companies = new Set(fixture.companies.map((item) => item.id));
  const seen = new Set();
  for (const [index, identity] of fixture.fakeAuth.identities.entries()) {
    const pathPrefix = `fakeAuth.identities[${index}]`;
    if (!uuid.test(identity.id) || !uuid.test(identity.userId)) errors.push(`${pathPrefix}: INVALID_UUID`);
    if (seen.has(identity.id)) errors.push(`${pathPrefix}.id: DUPLICATE_ID`);
    seen.add(identity.id);
    if (!users.has(identity.userId)) errors.push(`${pathPrefix}.userId: USER_NOT_FOUND ${identity.userId}`);
    if (identity.studentId && !students.has(identity.studentId)) errors.push(`${pathPrefix}.studentId: STUDENT_NOT_FOUND ${identity.studentId}`);
    if (identity.companyId && !companies.has(identity.companyId)) errors.push(`${pathPrefix}.companyId: COMPANY_NOT_FOUND ${identity.companyId}`);
    if (identity.roles.some((role) => !roles.has(role))) errors.push(`${pathPrefix}.roles: INVALID_ROLE`);
    if (!routes.has(identity.defaultRoute)) errors.push(`${pathPrefix}.defaultRoute: ROUTE_NOT_FOUND ${identity.defaultRoute}`);
    if (!identity.email.endsWith("@example.invalid")) errors.push(`${pathPrefix}.email: NON_FAKE_EMAIL`);
  }
  if (fixture.dataSetId !== dataSetId) errors.push(`dataSetId: EXPECTED_${dataSetId}`);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Validated ${dataSetId}: ${fixture.fakeAuth.identities.length} identities, no relationship or privacy errors.`);
  process.exit(0);
}

if (command !== "remove" || !dataSetId) {
  console.error("Usage: node scripts/fake-data-set.mjs list | validate <data-set-id> | remove <data-set-id>");
  process.exit(1);
}

if (!/^FD_Set_[0-9]{2}$/.test(dataSetId)) {
  console.error("Invalid fake data set id.");
  process.exit(1);
}

const target = path.resolve(root, `${dataSetId}.json`);
if (path.dirname(target) !== root) {
  console.error("Resolved path is outside the fake-data directory.");
  process.exit(1);
}

await rm(target);
console.log(`Removed fake data set: ${dataSetId}`);
