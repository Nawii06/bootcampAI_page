import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "./pages/public/home";
import Intro from "./pages/public/intro";
import Curriculum from "./pages/public/curriculum";
import Recruitment from "./pages/public/recruitment";
import Partners from "./pages/public/partners";
import Performance from "./pages/public/performance";
import Resources from "./pages/public/resources";
import Login from "./pages/login";

// Student Pages
import StudentDashboard from "./pages/student/dashboard";
import StudentApply from "./pages/student/apply";
import StudentStatus from "./pages/student/status";
import StudentCompletion from "./pages/student/completion";
import StudentPortfolio from "./pages/student/portfolio";

// Partner Pages
import PartnerDashboard from "./pages/partner/dashboard";
import PartnerSurvey from "./pages/partner/survey";
import PartnerEvaluation from "./pages/partner/evaluation";
import PartnerEmployment from "./pages/partner/employment";
import PartnerProject from "./pages/partner/project";

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

const queryClient = new QueryClient();

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
      
      <Route path="/login" component={Login} />

      <Route path="/student/dashboard" component={StudentDashboard} />
      <Route path="/student/apply" component={StudentApply} />
      <Route path="/student/status" component={StudentStatus} />
      <Route path="/student/completion" component={StudentCompletion} />
      <Route path="/student/portfolio" component={StudentPortfolio} />

      <Route path="/partner/dashboard" component={PartnerDashboard} />
      <Route path="/partner/survey" component={PartnerSurvey} />
      <Route path="/partner/project" component={PartnerProject} />
      <Route path="/partner/evaluation" component={PartnerEvaluation} />
      <Route path="/partner/employment" component={PartnerEmployment} />

      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/programs" component={AdminPrograms} />
      <Route path="/admin/applications" component={AdminApplications} />
      <Route path="/admin/completion" component={AdminCompletion} />
      <Route path="/admin/partners" component={AdminPartners} />
      <Route path="/admin/kpi" component={AdminKpi} />
      <Route path="/admin/budget" component={AdminBudget} />
      <Route path="/admin/budget-log" component={AdminBudgetLog} />
      <Route path="/admin/evidence" component={AdminEvidence} />
      <Route path="/admin/evaluation" component={AdminEvaluation} />
      <Route path="/admin/settings" component={AdminSettings} />

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
