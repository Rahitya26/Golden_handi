import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import AddData from './pages/AddData';
import Expenses from './pages/Expenses';
import Purchases from './pages/Purchases';

function App() {
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [activeFilter, setActiveFilter] = useState('This Month');
  const [selectedBranch, setSelectedBranch] = useState('Golden Handi (G.H)');

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <Sidebar selectedBranch={selectedBranch} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard dateRange={dateRange} selectedBranch={selectedBranch} />} />
            <Route path="/add-data" element={<AddData dateRange={dateRange} selectedBranch={selectedBranch} />} />
            <Route path="/expenses" element={<Expenses dateRange={dateRange} selectedBranch={selectedBranch} />} />
            <Route path="/purchases" element={<Purchases dateRange={dateRange} selectedBranch={selectedBranch} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
