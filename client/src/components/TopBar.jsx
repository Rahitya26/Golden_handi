import { format, startOfMonth, subDays, subMonths, startOfYear } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function TopBar({ dateRange, setDateRange, activeFilter, setActiveFilter, selectedBranch, setSelectedBranch }) {
  const branches = [
    'Golden Handi (G.H)',
    'FNF',
    'KSK',
    'Rainier',
    'Gandharva',
    'AVA Cloud Kitchen'
  ];
  const handleDateChange = (type, value) => {
    setDateRange(prev => ({
      ...prev,
      [type]: new Date(value)
    }));
    setActiveFilter('Custom');
  };

  const setPreset = (preset) => {
    const today = new Date();
    let start, end = today;
    switch (preset) {
      case 'This Month':
        start = startOfMonth(today);
        end = today;
        break;
      case 'Last 30 Days':
        start = subDays(today, 30);
        break;
      case 'Last 6 Months':
        start = subMonths(today, 6);
        break;
      case 'YTD':
        start = startOfYear(today);
        break;
    }
    setDateRange({ startDate: start, endDate: end });
    setActiveFilter(preset);
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-dark-bg border-b border-dark-border shrink-0 z-10">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold text-white tracking-wide hidden xl:block">
          Financial Overview
        </h2>

        {/* Glowing Branch Selector */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary to-brand-accent rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
          <div className="relative flex items-center bg-dark-card rounded-lg border border-dark-border overflow-hidden">
            <select
              value={selectedBranch || 'Golden Handi (G.H)'}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="appearance-none bg-transparent text-white font-bold tracking-wide px-5 py-2 pr-10 focus:outline-none cursor-pointer text-sm"
            >
              {branches.map(branch => (
                <option key={branch} value={branch} className="bg-dark-bg text-white font-medium py-2">
                  {branch}
                </option>
              ))}
            </select>
            <div className="absolute right-3 pointer-events-none text-brand-accent">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Filters */}
        <div className="hidden lg:flex items-center bg-dark-card border border-dark-border rounded-lg overflow-hidden p-1">
          {['This Month', 'Last 30 Days', 'Last 6 Months', 'YTD'].map(preset => (
            <button
              key={preset}
              onClick={() => setPreset(preset)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeFilter === preset
                  ? 'bg-brand-primary text-white'
                  : 'text-dark-muted hover:text-white hover:bg-dark-border/50'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center bg-dark-card border border-dark-border rounded-lg overflow-hidden">
          <div className="flex items-center px-3 py-2 border-r border-dark-border">
            <Calendar className="w-4 h-4 text-dark-muted mr-2" />
            <input
              type="date"
              value={format(dateRange.startDate, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none appearance-none"
            />
          </div>
          <div className="flex items-center px-3 py-2">
            <Calendar className="w-4 h-4 text-dark-muted mr-2" />
            <input
              type="date"
              value={format(dateRange.endDate, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none appearance-none"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
