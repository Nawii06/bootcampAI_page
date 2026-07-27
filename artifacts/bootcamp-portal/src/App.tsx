import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { withRoleGuard } from "./components/RoleGuard";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "./pages/public/home";
import Intro from "./pages/public/intro";
import Curriculum from "./pages/public/curriculum";
import Recruitment from "./pages/public/recruitment";
import Partners from "./pages/public/partners";
import Performance from "./pages/public/performance";
import Resources from "./pages/public/resources";
import PublicPortfolio from "./pages/public/portfolio";
import Login from "./pages/login";

// Student Pages
import StudentDashboard from "./pages/student/dashboard";
import StudentApply from "./pages/student/apply";
import StudentStatus from "./pages/student/status";
import StudentCompletion from "./pages/student/completion";
import StudentPortfolio from "./pages/student/portfolio";
import StudentLearning from "./pages/student/learning";

// Partner Pages
import PartnerDashboard from "./pages/partner/dashboard";
import PartnerSurvey from "./pages/partner/survey";
import PartnerEvaluation from "./pages/partner/evaluation";
import PartnerEmployment from "./pages/partner/employment";
import PartnerProject from "./pages/partner/project";
import PartnerApplication from "./pages/partner/application";

// Admin Pages
import AdminDashboard from "./pages/admin/dashboard";
import AdminApplications from "./pages/admin/applications";
import AdminPrograms from "./pages/admin/programs";
import AdminCompletion from "./pages/admin/completion";
import AdminPartners from "./pages/admin/partners";
import AdminKpi from "./pages/admin/kpi";
import AdminBudget from "./pages/admin/budget";
import AdminBudgetLog from "./pages/admin/budget-log";
import AdminEvidence from "./pages/admin/evidence";
import AdminEvaluation from "./pages/admin/evaluation";
import AdminSettings from "./pages/admin/settings";
import AdminPerformanceDashboard from "./pages/admin/performance-dashboard";
import AdminPerformanceIndicators from "./pages/admin/performance-indicators";
import AdminPerformanceResults from "./pages/admin/performance-results";
import AdminPerformanceEvidence from "./pages/admin/performance-evidence";
import AdminPerformanceSourceData from "./pages/admin/performance-source-data";
import AdminPerformanceExport from "./pages/admin/performance-export";
import AdminPreviewOperations from "./pages/admin/preview-operations";
import AdminAcademics from "./pages/admin/academics";
import AdminCourseImports from "./pages/admin/course-imports";
import AdminProgramOperations from "./pages/admin/program-operations";
import AdminBenefits from "./pages/admin/benefits";
import AdminContent from "./pages/admin/content";
import AdminAuditLogs from "./pages/admin/audit-logs";
import AdminEmployment from "./pages/admin/employment";

const queryClient = new QueryClient();
const studentRoles = ["STUDENT"];
const partnerRoles = ["COMPANY_APPLICANT", "COMPANY_MANAGER"];
const educationRoles = ["EDUCATION_STAFF", "REVIEWER"];
const companyStaffRoles = ["COMPANY_STAFF", "REVIEWER"];
const budgetRoles = ["BUDGET_STAFF", "AUDITOR", "REVIEWER"];
const performanceRoles = ["PERFORMANCE_STAFF", "AUDITOR", "REVIEWER"];
const benefitRoles = ["BENEFIT_STAFF", "AUDITOR", "REVIEWER"];
const adminOverviewRoles = [
  "EDUCATION_STAFF", "BENEFIT_STAFF", "COMPANY_STAFF", "BUDGET_STAFF",
  "PERFORMANCE_STAFF", "CONTENT_EDITOR", "REVIEWER", "AUDITOR",
];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/public/home" component={Home} />
      <Route path="/public/intro" component={Intro} />
      <Route path="/public/curriculum" component={Curriculum} />
      <Route path="/public/recruitment" component={Recruitment} />
      <Route path="/public/partners" component={Partners} />
      <Route path="/public/performance" component={Performance} />
      <Route path="/public/resources" component={Resources} />
      <Route path="/public/portfolio/:token" component={PublicPortfolio} />
      
      <Route path="/login" component={Login} />

      <Route path="/student/dashboard" component={withRoleGuard(StudentDashboard, studentRoles)} />
      <Route path="/student/apply" component={withRoleGuard(StudentApply, studentRoles)} />
      <Route path="/student/status" component={withRoleGuard(StudentStatus, studentRoles)} />
      <Route path="/student/completion" component={withRoleGuard(StudentCompletion, studentRoles)} />
      <Route path="/student/portfolio" component={withRoleGuard(StudentPortfolio, studentRoles)} />
      <Route path="/student/learning" component={withRoleGuard(StudentLearning, studentRoles)} />

      <Route path="/partner/dashboard" component={withRoleGuard(PartnerDashboard, partnerRoles)} />
      <Route path="/partner/application" component={withRoleGuard(PartnerApplication, partnerRoles)} />
      <Route path="/partner/survey" component={withRoleGuard(PartnerSurvey, partnerRoles)} />
      <Route path="/partner/project" component={withRoleGuard(PartnerProject, ["COMPANY_MANAGER"])} />
      <Route path="/partner/evaluation" component={withRoleGuard(PartnerEvaluation, ["COMPANY_MANAGER"])} />
      <Route path="/partner/employment" component={withRoleGuard(PartnerEmployment, ["COMPANY_MANAGER"])} />

      <Route path="/admin/dashboard" component={withRoleGuard(AdminDashboard, adminOverviewRoles)} />
      <Route path="/admin/programs" component={withRoleGuard(AdminPrograms, educationRoles)} />
      <Route path="/admin/academics" component={withRoleGuard(AdminAcademics, educationRoles)} />
      <Route path="/admin/course-imports" component={withRoleGuard(AdminCourseImports, educationRoles)} />
      <Route path="/admin/program-operations" component={withRoleGuard(AdminProgramOperations, educationRoles)} />
      <Route path="/admin/benefits" component={withRoleGuard(AdminBenefits, benefitRoles)} />
      <Route path="/admin/content" component={withRoleGuard(AdminContent, ["CONTENT_EDITOR", "REVIEWER", "AUDITOR"])} />
      <Route path="/admin/applications" component={withRoleGuard(AdminApplications, educationRoles)} />
      <Route path="/admin/completion" component={withRoleGuard(AdminCompletion, educationRoles)} />
      <Route path="/admin/partners" component={withRoleGuard(AdminPartners, companyStaffRoles)} />
      <Route path="/admin/kpi" component={withRoleGuard(AdminKpi, performanceRoles)} />
      <Route path="/admin/budget" component={withRoleGuard(AdminBudget, budgetRoles)} />
      <Route path="/admin/budget-log" component={withRoleGuard(AdminBudgetLog, budgetRoles)} />
      <Route path="/admin/evidence" component={withRoleGuard(AdminEvidence, ["EDUCATION_STAFF","BUDGET_STAFF","PERFORMANCE_STAFF","AUDITOR","REVIEWER"])} />
      <Route path="/admin/evaluation" component={withRoleGuard(AdminEvaluation, ["REVIEWER","PERFORMANCE_STAFF"])} />
      <Route path="/admin/settings" component={withRoleGuard(AdminSettings, [])} />
      <Route path="/admin/performance" component={withRoleGuard(AdminPerformanceDashboard, performanceRoles)} />
      <Route path="/admin/performance/indicators" component={withRoleGuard(AdminPerformanceIndicators, performanceRoles)} />
      <Route path="/admin/performance/results" component={withRoleGuard(AdminPerformanceResults, performanceRoles)} />
      <Route path="/admin/performance/evidence" component={withRoleGuard(AdminPerformanceEvidence, performanceRoles)} />
      <Route path="/admin/performance/source-data" component={withRoleGuard(AdminPerformanceSourceData, performanceRoles)} />
      <Route path="/admin/performance/export" component={withRoleGuard(AdminPerformanceExport, performanceRoles)} />
      <Route path="/admin/preview-operations" component={withRoleGuard(AdminPreviewOperations, adminOverviewRoles)} />
      <Route path="/admin/audit-logs" component={withRoleGuard(AdminAuditLogs, ["AUDITOR"])} />
      <Route path="/admin/employment" component={withRoleGuard(AdminEmployment, companyStaffRoles)} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
