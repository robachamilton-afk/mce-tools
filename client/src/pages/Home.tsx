import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, FileText, Upload, CheckSquare, Menu, Linkedin } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    {
      id: "project-management",
      title: "Project Management",
      description: "Create and manage renewable energy projects with isolated databases for data sovereignty. Each project gets its own secure environment.",
      icon: <Database className="h-8 w-8" />,
      color: "from-indigo-500 to-indigo-600",
      action: () => setLocation("/projects"),
      status: "Active",
    },
    {
      id: "document-ingestion",
      title: "Document Ingestion",
      description: "Upload and process IMs, DD packs, contracts, and grid studies. Hybrid extraction combines deterministic parsing with Ollama LLM analysis.",
      icon: <Upload className="h-8 w-8" />,
      color: "from-orange-500 to-orange-600",
      action: () => setLocation("/projects"),
      status: "Active",
    },
    {
      id: "fact-extraction",
      title: "Fact Extraction & Verification",
      description: "Extract structured and unstructured facts from documents with confidence scoring. Review and approve AI-extracted data before integration.",
      icon: <CheckSquare className="h-8 w-8" />,
      color: "from-green-500 to-green-600",
      action: null,
      status: "Coming Soon",
    },
    {
      id: "pdr-generation",
      title: "PDR Generation",
      description: "Generate Project Definition Reports in PDF, Word, and Excel formats. Auto-populate sections with extracted facts and red-flag summaries.",
      icon: <FileText className="h-8 w-8" />,
      color: "from-pink-500 to-pink-600",
      action: null,
      status: "Coming Soon",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header - Matching OE Toolkit Style */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 md:py-6 flex items-center justify-between">
          {/* Logo Section */}
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/mce-logo.png" 
              alt="Main Character Energy" 
              className="h-10 w-10 md:h-12 md:w-12" 
            />
            <div>
              <div className="text-lg md:text-2xl font-bold text-white tracking-tight">
                MAIN CHARACTER ENERGY
              </div>
              <div className="text-xs md:text-sm text-slate-400 font-medium">
                Project Intake & Ingestion Engine
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated && (
              <button
                onClick={() => setLocation("/projects")}
                className="text-slate-300 hover:text-orange-400 transition-colors font-medium"
              >
                My Projects
              </button>
            )}
            <a 
              href="https://www.linkedin.com/company/main-character-energy-consulting/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#0077b5] transition-colors"
              aria-label="Follow us on LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden text-slate-300 hover:text-white transition-colors p-2">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-slate-900 border-slate-700">
              <div className="flex flex-col gap-8 mt-8">
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setLocation("/projects");
                      setIsMenuOpen(false);
                    }}
                    className="text-xl font-semibold text-slate-300 hover:text-white transition-colors py-2 text-left"
                  >
                    My Projects
                  </button>
                )}
                <a 
                  href="https://www.linkedin.com/company/main-character-energy-consulting/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-semibold text-slate-300 hover:text-orange-400 transition-colors py-2 flex items-center gap-2"
                >
                  <Linkedin className="h-5 w-5" />
                  LinkedIn
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-32 lg:py-40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Project Intake & Ingestion Engine
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-300 mb-6 leading-relaxed">
              Document intelligence platform for renewable energy projects. Extract facts, detect risks, 
              and generate comprehensive Project Definition Reports.
            </p>

            {/* Description */}
            <p className="text-lg text-slate-400 mb-12 leading-relaxed max-w-3xl">
              Ingest IMs, DD packs, concept designs, and grid studies. Hybrid extraction combines deterministic 
              parsing with Ollama LLM analysis to create a structured Project Fact Base. Maintain data sovereignty 
              with per-project databases while contributing de-identified insights to the knowledge base.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  onClick={() => setLocation("/projects")}
                >
                  Go to Projects
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  onClick={() => window.location.href = "/api/oauth/login"}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline" 
                className="border-slate-600 text-white hover:bg-slate-800 hover:text-white"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-slate-800/30">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Core Capabilities
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl">
              Comprehensive document intelligence for TA/TDD and pre-Financial Close workflows. 
              Extract insights, detect risks, and maintain data sovereignty.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature) => {
              const isActive = feature.status === "Active";
              const isComingSoon = feature.status === "Coming Soon";
              return (
                <div
                  key={feature.id}
                  className={`group ${isComingSoon ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                  onClick={() => isActive && feature.action && feature.action()}
                >
                  <div className={`h-full flex flex-col bg-slate-900/50 border rounded-xl p-8 transition-all duration-300 ${
                    isActive 
                      ? "border-slate-700/50 hover:border-orange-500/50 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-orange-500/10" 
                      : "border-slate-700/30 hover:border-slate-700/50"
                  }`}>
                    {/* Header with Icon and Status */}
                    <div className="flex items-start justify-between mb-6">
                      <div className={`p-4 rounded-lg bg-gradient-to-br ${feature.color} text-white`}>
                        {feature.icon}
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        isActive
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-slate-600/20 text-slate-400 border border-slate-600/30"
                      }`}>
                        {feature.status}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${
                      isActive
                        ? "text-white group-hover:text-orange-400"
                        : "text-slate-300"
                    }`}>
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-300 text-sm leading-relaxed mb-8 flex-grow">
                      {feature.description}
                    </p>

                    {/* Footer with Arrow */}
                    {isActive && (
                      <div className="flex items-center text-orange-400 font-semibold group-hover:gap-3 gap-2 transition-all duration-300">
                        <span>Access Feature</span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    )}
                    {isComingSoon && (
                      <div className="flex items-center text-slate-500 font-semibold">
                        <span>Coming Soon</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-orange-400 mb-2">Per-Project DBs</div>
              <div className="text-sm text-slate-300">Isolated databases for data sovereignty and compliance</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-orange-400 mb-2">Hybrid Extraction</div>
              <div className="text-sm text-slate-300">Deterministic + Ollama LLM for comprehensive fact extraction</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
              <div className="text-3xl font-bold text-orange-400 mb-2">Multi-Format Export</div>
              <div className="text-sm text-slate-300">Generate PDRs in PDF, Word, and Excel formats</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 py-12 md:py-16 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <p className="text-slate-400 text-sm">
                © 2026 Main Character Energy. All rights reserved.
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Project Intake & Ingestion Engine — Part of OE Toolkit v2.0
              </p>
            </div>
            <div className="flex gap-6">
              <button
                onClick={() => setLocation("/projects")}
                className="text-slate-400 hover:text-orange-400 transition-colors text-sm"
              >
                Projects
              </button>
              <a
                href="#"
                className="text-slate-400 hover:text-orange-400 transition-colors text-sm"
              >
                Documentation
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-orange-400 transition-colors text-sm"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
