import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Search sites as user types
  const { data: searchResults } = trpc.sites.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show dropdown when there are results
  useEffect(() => {
    if (searchResults && searchResults.length > 0 && searchQuery.length >= 2) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [searchResults, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSite(searchResults[selectedIndex].id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelectSite = (siteId: number) => {
    setIsOpen(false);
    setSearchQuery("");
    setLocation(`/site/${siteId}`);
  };

  return (
    <div ref={searchRef} className="relative max-w-2xl mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
      <Input
        type="text"
        placeholder="Search by site name or DUID (e.g., 'Clare Solar Farm' or 'CLARESF1')"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (searchResults && searchResults.length > 0 && searchQuery.length >= 2) {
            setIsOpen(true);
          }
        }}
        className="pl-12 h-14 text-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
      />

      {/* Autocomplete Dropdown */}
      {isOpen && searchResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl max-h-[500px] overflow-y-auto z-50">
          {searchResults.map((site, index) => (
            <button
              key={site.id}
              onClick={() => handleSelectSite(site.id)}
              className={`w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                index === selectedIndex ? "bg-slate-50 dark:bg-slate-700" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white text-base mb-1 truncate">
                    {site.name}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {site.duid}
                    </span>
                    {site.latitude && site.longitude && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {Number(site.latitude).toFixed(2)}°, {Number(site.longitude).toFixed(2)}°
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-lg font-bold text-slate-900 dark:text-white">
                    <Zap className="h-4 w-4 text-orange-500" />
                    {site.capacityDcMw ? `${Number(site.capacityDcMw).toFixed(1)} MW` : "—"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">DC Capacity</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && searchQuery.length >= 2 && (!searchResults || searchResults.length === 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-8 text-center z-50">
          <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            No sites found matching "<span className="font-semibold">{searchQuery}</span>"
          </p>
        </div>
      )}
    </div>
  );
}
