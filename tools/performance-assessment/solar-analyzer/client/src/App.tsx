import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SiteDetail from "./pages/SiteDetail";
import Dashboard from "./pages/Dashboard";
import EquipmentTagging from "./pages/EquipmentTagging";
import CustomAnalysis from "./pages/CustomAnalysis";
import CustomAnalysisResults from "./pages/CustomAnalysisResults";
import EquationReviewPage from "./pages/EquationReviewPage";
import NewAssessment from "./pages/NewAssessment";
import Assessments from "./pages/Assessments";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/site/:id"} component={SiteDetail} />
      <Route path={" /site/:id/equipment"} component={EquipmentTagging} />
      <Route path="/site/:id/custom-analysis" component={CustomAnalysis} />
      <Route path="/site/:id/custom-analysis/:analysisId/results" component={CustomAnalysisResults} />
      <Route path="/custom-analysis/:id" component={CustomAnalysis} />
      <Route path="/custom-analysis/:id/results" component={CustomAnalysisResults} />
      <Route path="/custom-analysis/:id/review-equations" component={EquationReviewPage} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/new-assessment"} component={NewAssessment} />
      <Route path={"/assessments"} component={Assessments} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
