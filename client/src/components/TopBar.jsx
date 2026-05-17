import { format, startOfMonth, subDays, subMonths, startOfYear } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function TopBar({ dateRange, setDateRange, activeFilter, setActiveFilter }) {
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
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-white tracking-wide">
          Financial Overview
        </h2>
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
