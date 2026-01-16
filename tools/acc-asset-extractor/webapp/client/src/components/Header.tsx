export default function Header() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex items-center justify-between">
          {/* Logo and Branding */}
          <div className="flex items-center gap-3 md:gap-4">
            <img 
              src="/mce-logo.png" 
              alt="Main Character Energy" 
              className="h-10 w-10 md:h-16 md:w-16"
            />
            <div className="flex flex-col">
              <div className="text-lg md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-0.5 md:mb-1">
                MAIN CHARACTER ENERGY
              </div>
              <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">
                ACC Asset Extractor
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
