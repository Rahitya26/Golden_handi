import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, CheckCircle, XCircle, Upload } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';

export default function Dashboard({ dateRange }) {
  const [summary, setSummary] = useState({
    'Tea Counter': 0,
    'Restaurant': 0,
    'Online': 0,
    'Expenses': 0,
    'Purchases': 0
  });
  const [chartData, setChartData] = useState([]);
  const [profitChartData, setProfitChartData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDate, setBulkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkFile, setBulkFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Inline Form State
  const [addAmount, setAddAmount] = useState('');
  const [addSubCategory, setAddSubCategory] = useState('UPI');
  const [addDate, setAddDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchSummary();
    fetchChartData();
    fetchProfitChartData();
  }, [dateRange]);

  const fetchSummary = async () => {
    try {
      const params = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd')
      };
      const res = await axios.get(`${API_URL}/dashboard/summary`, { params });
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to fetch summary', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const params = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd')
      };
      const res = await axios.get(`${API_URL}/dashboard/chart`, { params });
      
      const formattedData = res.data.map(item => ({
        name: format(new Date(item.date), 'MMM dd'),
        Tea: Number(item.Tea) || 0,
        Restaurant: Number(item.Restaurant) || 0,
        Online: Number(item.Online) || 0
      }));
      setChartData(formattedData);
    } catch (error) {
      console.error('Failed to fetch chart data', error);
    }
  };

  const fetchProfitChartData = async () => {
    try {
      const params = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd')
      };
      const res = await axios.get(`${API_URL}/dashboard/profit-chart`, { params });
      const formattedData = res.data.map(item => ({
        name: format(new Date(item.date), 'MMM dd'),
        Outflow: Number(item.outflow) || 0,
        Profits: Number(item.profits) || 0,
      }));
      setProfitChartData(formattedData);
    } catch (error) {
      console.error('Failed to fetch profit chart data', error);
    }
  };

  const fetchBreakdown = async (category) => {
    if (category === 'Expenses' || category === 'Purchases' || category === 'Profits') return; 
    try {
      const params = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd')
      };
      const res = await axios.get(`${API_URL}/dashboard/breakdown/${encodeURIComponent(category)}`, { params });
      setBreakdown(res.data);
      setSelectedCategory(category);
      setAddAmount('');
      setAddSubCategory(category === 'Online' ? 'Swiggy' : 'UPI');
      setAddDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Failed to fetch breakdown', error);
    }
  };

  const handleInlineAdd = async (e) => {
    e.preventDefault();
    if (!addAmount) return;
    try {
      const rawAmount = Number(addAmount.replace(/,/g, ''));
      await axios.post(`${API_URL}/sales`, {
        category: selectedCategory,
        amount: rawAmount,
        sale_date: addDate,
        sub_category: addSubCategory
      });
      fetchBreakdown(selectedCategory);
      fetchSummary();
      fetchChartData();
      fetchProfitChartData();
      setAddAmount('');
      setAddDate(format(new Date(), 'yyyy-MM-dd'));
      showToast('Data added successfully');
    } catch (error) {
      console.error(error);
      showToast('Failed to add data', 'error');
    }
  };

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAddAmount('');
      return;
    }
    const formatted = Number(val).toLocaleString('en-IN');
    setAddAmount(formatted);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const params = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd')
      };
      const res = await axios.get(`${API_URL}/dashboard/report-data`, { params });
      const { sales, purchases, expenses } = res.data;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Financial Report');

      sheet.columns = [
        { header: 'Category', key: 'category', width: 45 },
        { header: 'Amount', key: 'amount', width: 25 }
      ];
      
      sheet.spliceRows(1, 1); // remove default header row

      // Main Title
      const titleText = `PROFIT AND LOSS ACCOUNT STATEMENT FOR THE PERIOD ${format(dateRange.startDate, 'MMM dd, yyyy').toUpperCase()} TO ${format(dateRange.endDate, 'MMM dd, yyyy').toUpperCase()}`;
      const titleRow = sheet.addRow([titleText]);
      titleRow.font = { bold: true, size: 12 };
      sheet.mergeCells('A1:B1');
      sheet.addRow([]);

      const addHeadingRow = (text) => {
        const row = sheet.addRow([text.toUpperCase()]);
        row.font = { bold: true, size: 13 };
        return row;
      };

      const addDataRow = (category, amount) => {
        const row = sheet.addRow([category.toUpperCase(), amount]);
        row.getCell(2).numFmt = '₹#,##0.00';
        return row;
      };

      const addTotalRow = (text, amount) => {
        const row = sheet.addRow([text.toUpperCase(), amount]);
        row.font = { bold: true, size: 12 };
        row.getCell(2).numFmt = '₹#,##0.00';
        return row;
      };

      const addCalcRow = (text, amount, isPercentage = false) => {
        const row = sheet.addRow([text.toUpperCase(), amount]);
        row.font = { bold: true, size: 12 };
        if (isPercentage) {
          row.getCell(2).numFmt = '0.00%';
        } else {
          row.getCell(2).numFmt = '₹#,##0.00';
        }
        return row;
      };

      // 1. SALES
      addHeadingRow('Sales');
      const salesMap = { 'Tea Counter': 0, 'Restaurant': 0, 'Online': 0 };
      sales.forEach(s => {
        salesMap[s.category] = Number(s.total) || 0;
      });
      const totalSales = salesMap['Tea Counter'] + salesMap['Restaurant'] + salesMap['Online'];
      
      addDataRow('TEA', salesMap['Tea Counter']);
      addDataRow('RESTAURANT', salesMap['Restaurant']);
      addDataRow('ONLINE', salesMap['Online']);
      addTotalRow('TOTAL SALE', totalSales);
      sheet.addRow([]);

      // 2. PURCHASES
      addHeadingRow('Purchases');
      let totalPurchases = 0;
      purchases.forEach(p => {
        const amt = Number(p.total) || 0;
        addDataRow(p.category, amt);
        totalPurchases += amt;
      });
      addTotalRow('TOTAL PURCHASES', totalPurchases);
      sheet.addRow([]);

      // 3. GROSS PROFIT
      const grossProfit = totalSales - totalPurchases;
      const grossProfitPercent = totalSales > 0 ? (grossProfit / totalSales) : 0;
      addCalcRow('GROSS PROFIT', grossProfit);
      addCalcRow('GROSS PROFIT PERCENTAGE', grossProfitPercent, true);
      sheet.addRow([]);

      // 4. EXPENSES
      addHeadingRow('Expenses');
      let totalExpenses = 0;
      expenses.forEach(e => {
        const amt = Number(e.total) || 0;
        addDataRow(e.category, amt);
        totalExpenses += amt;
      });
      addTotalRow('TOTAL EXPENSES', totalExpenses);
      sheet.addRow([]);

      // 5. NET PROFIT
      const netProfit = grossProfit - totalExpenses;
      const netProfitPercent = totalSales > 0 ? (netProfit / totalSales) : 0;
      addCalcRow('NET PROFIT', netProfit);
      addCalcRow('NET PROFIT PERCENTAGE', netProfitPercent, true);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `P&L Sheet ${format(dateRange.startDate, 'MMM dd, yyyy')} to ${format(dateRange.endDate, 'MMM dd, yyyy')}.xlsx`);
      showToast('Report generated successfully');
    } catch (error) {
      console.error('Download failed', error);
      showToast('Failed to download report', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFile) return showToast('Please select an Excel file first.', 'error');
    setIsImporting(true);
    try {
      const buffer = await bulkFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      
      const items = [];
      const mappings = [];
      
      // Step 1: Scan row 1 for headers
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        const text = cell.text.trim().toLowerCase();
        if (text === 'tea') mappings.push({ index: colNumber, category: 'Tea Counter' });
        if (text === 'restaurant') mappings.push({ index: colNumber, category: 'Restaurant' });
        if (text === 'online') mappings.push({ index: colNumber, category: 'Online' });
      });

      if (mappings.length === 0) {
        setIsImporting(false);
        return showToast('No valid headers (Tea, Restaurant, Online) found in Row 1.', 'error');
      }

      // Step 2: Parse data rows dynamically based on the mappings
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          mappings.forEach(mapping => {
            const subCat = row.getCell(mapping.index).text;
            const amountStr = row.getCell(mapping.index + 1).text; // Amount should be the immediate next column
            
            if (subCat && amountStr) {
              const rawAmount = Number(amountStr.replace(/,/g, '').replace(/[^0-9.-]+/g,""));
              if (!isNaN(rawAmount) && amountStr.match(/[0-9]/)) {
                items.push({
                  category: mapping.category,
                  sub_category: subCat.trim(),
                  amount: rawAmount,
                  sale_date: bulkDate
                });
              }
            }
          });
        }
      });

      if (items.length === 0) {
        setIsImporting(false);
        return showToast('No valid data found under the headers.', 'error');
      }

      await axios.post(`${API_URL}/sales/bulk`, items);
      setShowBulkModal(false);
      setBulkFile(null);
      fetchSummary();
      fetchChartData();
      fetchProfitChartData();
      showToast(`Successfully imported ${items.length} sales!`);
    } catch (error) {
      console.error(error);
      showToast('Bulk import failed. Please check your Excel format.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const totalSales = Number(summary['Tea Counter'] || 0) + Number(summary['Restaurant'] || 0) + Number(summary['Online'] || 0);
  const totalExpenses = Number(summary['Expenses'] || 0);
  const totalPurchases = Number(summary['Purchases'] || 0);
  const profits = totalSales - totalExpenses - totalPurchases;

  const cards = [
    { title: 'Tea Counter', value: summary['Tea Counter'] || 0, color: 'text-brand-success', clickable: true },
    { title: 'Restaurant', value: summary['Restaurant'] || 0, color: 'text-brand-primary', clickable: true },
    { title: 'Online', value: summary['Online'] || 0, color: 'text-brand-accent', clickable: true },
    { title: 'Expenses', value: summary['Expenses'] || 0, color: 'text-brand-danger', clickable: false },
    { title: 'Purchases', value: summary['Purchases'] || 0, color: 'text-orange-400', clickable: false },
    { title: 'Profits', value: profits, color: 'text-white', clickable: false },
  ];

  const getPercent = (val) => {
    if (totalSales === 0) return 0;
    return ((val / totalSales) * 100).toFixed(1);
  };

  const formatIndianNumber = (num) => {
    if (num === 0) return '0';
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    if (absNum >= 10000000) {
      return `${sign}${(absNum / 10000000).toFixed(2)}Cr`;
    } else if (absNum >= 100000) {
      return `${sign}${(absNum / 100000).toFixed(2)}L`;
    }
    
    return `${sign}${absNum.toLocaleString('en-IN')}`;
  };

  const breakdownTotal = breakdown.reduce((sum, item) => sum + Number(item.total), 0);

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 uppercase tracking-wide">Dashboard</h2>
          <p className="text-brand-accent text-sm tracking-widest uppercase">Financial Overview</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-dark-card hover:bg-dark-bg border border-dark-border text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 uppercase tracking-wide shadow-lg shadow-black/20"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="bg-brand-success hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 uppercase tracking-wide shadow-lg shadow-brand-success/20 disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Generating...' : 'Download Report'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {cards.map((card) => (
          <div 
            key={card.title} 
            className={`bg-dark-card p-6 rounded-xl border border-dark-border transition-colors group relative ${card.clickable ? 'cursor-pointer hover:border-dark-muted' : ''}`}
            onClick={() => card.clickable && fetchBreakdown(card.title)}
          >
            <h3 className="text-sm font-medium text-dark-muted uppercase tracking-wider mb-2">{card.title}</h3>
            <p className={`text-3xl font-bold ${card.color}`}>
              ₹{formatIndianNumber(Number(card.value))}
            </p>
            
            {/* Custom Hover Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-white text-sm font-bold shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 flex items-center gap-1.5 before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-dark-border">
              <span className={card.color}>₹{Number(card.value).toLocaleString('en-IN')}</span>
            </div>

            {card.clickable && <p className="text-xs text-dark-muted mt-2">Click for breakdown ↗</p>}
          </div>
        ))}
      </div>

      {/* Main Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Profitability */}
        <div className="lg:col-span-1 bg-dark-card p-6 rounded-xl border border-dark-border flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <svg className="w-5 h-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <h3 className="text-lg font-bold text-white">Profitability by Process Type</h3>
          </div>

          <div className="space-y-8 flex-1">
            {/* Restaurant */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-white">Restaurant</span>
                <span className="text-sm font-bold text-white">₹{Number(summary['Restaurant'] || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-2 w-full bg-dark-bg rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary rounded-full" style={{ width: `${getPercent(summary['Restaurant'])}%` }}></div>
              </div>
              <div className="text-xs text-dark-muted mt-1">{getPercent(summary['Restaurant'])}% CONTRIBUTION</div>
            </div>

            {/* Tea Counter */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-white">Tea Counter</span>
                <span className="text-sm font-bold text-white">₹{Number(summary['Tea Counter'] || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-2 w-full bg-dark-bg rounded-full overflow-hidden">
                <div className="h-full bg-brand-success rounded-full" style={{ width: `${getPercent(summary['Tea Counter'])}%` }}></div>
              </div>
              <div className="text-xs text-dark-muted mt-1">{getPercent(summary['Tea Counter'])}% CONTRIBUTION</div>
            </div>

            {/* Online */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-white">Online</span>
                <span className="text-sm font-bold text-white">₹{Number(summary['Online'] || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-2 w-full bg-dark-bg rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent rounded-full" style={{ width: `${getPercent(summary['Online'])}%` }}></div>
              </div>
              <div className="text-xs text-dark-muted mt-1">{getPercent(summary['Online'])}% CONTRIBUTION</div>
            </div>
          </div>
        </div>

        {/* Right Col: Profit vs Outflow Chart */}
        <div className="lg:col-span-2 bg-dark-card p-6 rounded-xl border border-dark-border flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-brand-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-bold text-white">Profits vs Outflow</h3>
          </div>
          
          <div className="flex-1 min-h-[300px]">
            {profitChartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-dark-muted">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>Not enough data to display.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38a169" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#38a169" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#e53e3e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="name" stroke="#a0aec0" tick={{fill: '#a0aec0'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#a0aec0" tick={{fill: '#a0aec0'}} axisLine={false} tickLine={false} tickFormatter={(val) => '₹' + val} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171923', borderColor: '#2d3748', color: '#f7fafc', borderRadius: '8px' }}
                    itemStyle={{ color: '#f7fafc' }}
                    formatter={(value) => '₹' + Number(value).toLocaleString('en-IN')}
                    cursor={{ stroke: '#2d3748', strokeWidth: 2 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="Profits" stroke="#38a169" fillOpacity={1} fill="url(#colorProfits)" />
                  <Area type="monotone" dataKey="Outflow" stroke="#e53e3e" fillOpacity={1} fill="url(#colorOutflow)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Financial Trends BarChart */}
      <div className="bg-dark-card p-6 rounded-xl border border-dark-border flex flex-col mt-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h3 className="text-lg font-bold text-white">Financial Trends</h3>
        </div>
        
        <div className="w-full min-h-[300px]">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-dark-muted py-10">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Not enough data to display.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="name" stroke="#a0aec0" tick={{fill: '#a0aec0'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#a0aec0" tick={{fill: '#a0aec0'}} axisLine={false} tickLine={false} tickFormatter={(val) => '₹' + val} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171923', borderColor: '#2d3748', color: '#f7fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#f7fafc' }}
                  formatter={(value) => '₹' + Number(value).toLocaleString('en-IN')}
                  cursor={{ fill: '#2d3748', opacity: 0.4 }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Restaurant" fill="#3182ce" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tea" fill="#38a169" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Online" fill="#4fd1c5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Modal Backdrop */}
      {selectedCategory && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCategory(null)}
        >
          {/* Modal Content */}
          <div 
            className="bg-dark-card p-6 rounded-2xl border border-dark-border w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold text-white tracking-wide">{selectedCategory}</h3>
              <button onClick={() => setSelectedCategory(null)} className="text-dark-muted hover:text-white p-1 bg-dark-bg rounded-md transition-colors">&times;</button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-6">
              {/* Breakdown List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-dark-muted uppercase tracking-widest">Revenue Breakdown</h4>
                {breakdown.length === 0 ? (
                  <p className="text-sm text-dark-muted py-2">No data available for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {breakdown.map(item => (
                      <div key={item.sub_category} className="flex justify-between items-center p-3 bg-dark-bg rounded-lg border border-dark-border">
                        <span className="text-sm text-white uppercase">{item.sub_category}</span>
                        <span className="text-sm text-brand-accent font-medium">₹{Number(item.total).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {/* Total Row */}
                    <div className="flex justify-between items-center p-3 bg-dark-bg rounded-lg border border-brand-primary/30 mt-4">
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Total</span>
                      <span className="text-base font-bold text-brand-primary">₹{breakdownTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px w-full bg-dark-border"></div>

              {/* Quick Add Form */}
              <form onSubmit={handleInlineAdd} className="space-y-4 pb-2">
                <h4 className="text-xs font-bold text-dark-muted uppercase tracking-widest">Quick Log Sale</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Amount (₹)</label>
                      <input
                        type="text"
                        value={addAmount}
                        onChange={handleAmountChange}
                        required
                        placeholder="0"
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary placeholder:text-dark-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">
                        {selectedCategory === 'Online' ? 'Platform' : 'Payment Mode'}
                      </label>
                      <select
                        value={addSubCategory}
                        onChange={(e) => setAddSubCategory(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                      >
                        {selectedCategory === 'Online' ? (
                          <>
                            <option value="Swiggy">Swiggy</option>
                            <option value="Zomato">Zomato</option>
                          </>
                        ) : (
                          <>
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Date of Sale</label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      required
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-brand-primary hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors text-xs uppercase tracking-wider shadow-lg shadow-brand-primary/20"
                >
                  Commit Sale
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border shadow-2xl ${
            toast.type === 'error' 
              ? 'bg-brand-danger/10 border-brand-danger/30 text-brand-danger' 
              : 'bg-brand-success/10 border-brand-success/30 text-brand-success'
          }`}>
            {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="text-sm font-bold uppercase tracking-wider">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-dark-card rounded-2xl border border-dark-border w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Bulk Import Sales</h3>
                  <p className="text-xs text-dark-muted uppercase tracking-wider mt-1">Upload via Excel (.xlsx)</p>
                </div>
                <button onClick={() => {setShowBulkModal(false); setBulkFile(null);}} className="text-dark-muted hover:text-white p-1 bg-dark-bg rounded-md">&times;</button>
              </div>

              <div className="space-y-6">
                <div className="bg-brand-primary/10 border border-brand-primary/30 p-4 rounded-lg">
                  <p className="text-sm text-brand-primary leading-relaxed">
                    The system will dynamically scan Row 1 for <span className="font-bold text-white">Tea</span>, <span className="font-bold text-white">Restaurant</span>, or <span className="font-bold text-white">Online</span> headers, and extract the sub-category and amount (from the very next column) automatically.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Assign Date to All Imports</label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    required
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Select Excel File</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setBulkFile(e.target.files[0])}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-sm text-dark-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-brand-primary file:text-white hover:file:bg-blue-600 focus:outline-none focus:border-brand-primary cursor-pointer"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => {setShowBulkModal(false); setBulkFile(null);}}
                    className="flex-1 bg-dark-bg text-dark-muted hover:text-white font-medium py-3 rounded-lg border border-dark-border transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={isImporting || !bulkFile}
                    className="flex-1 bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Importing...</span>
                      </>
                    ) : (
                      'Start Import'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
