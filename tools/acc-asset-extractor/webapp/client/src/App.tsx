import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import Header from "./components/Header";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Configure from "./pages/Configure";
import Dashboard from "./pages/Dashboard";
import Validate from "./pages/Validate";
import Export from "./pages/Export";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <>
      <Header />
      <Switch>
      <Route path={"/"} component={Configure} />
      <Route path="/dashboard/:jobId" component={Dashboard} />
      <Route path="/validate/:jobId" component={Validate} />
      <Route path="/export/:jobId" component={Export} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
    </>
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
        // switchable
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
