import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex items-center justify-between">
          {/* Logo - Centered on mobile, Left on desktop */}
          <Link href="/" className="flex items-center gap-3 md:gap-4 hover:opacity-90 transition-opacity cursor-pointer">
            <img src="/mce-logo.png" alt="Main Character Energy" className="h-10 w-10 md:h-20 md:w-20" />
            <div className="flex flex-col">
              <div className="text-lg md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-0.5 md:mb-1">
                MAIN CHARACTER ENERGY
              </div>
              <div className="text-xs md:text-base text-slate-600 dark:text-slate-400 font-medium">
                Solar Performance Analyzer
              </div>
            </div>
          </Link>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-slate-500 hover:text-orange-500 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 md:h-7 md:w-7" />
              ) : (
                <Moon className="h-5 w-5 md:h-7 md:w-7" />
              )}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-400 font-semibold transition-colors">
                Sites
              </Link>
              <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-400 font-semibold transition-colors">
                Dashboard
              </Link>
              <Link href="/assessments" className="text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-400 font-semibold transition-colors">
                Assessments
              </Link>
            </nav>

            <Link href="/new-assessment" className="hidden md:block">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8" asChild>
                <span>New Assessment</span>
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <button className="md:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-slate-900 border-slate-800">
                <div className="flex flex-col gap-8 mt-8">
                  <Link 
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Sites
                  </Link>
                  <Link 
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/assessments"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Assessments
                  </Link>
                  <Link 
                    href="/new-assessment"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-semibold text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    New Assessment
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
