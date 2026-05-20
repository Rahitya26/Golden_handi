import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Plus, Upload, Search, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';

const defaultCategories = [
  "Bakery Items", "Basmati Rice", "Biscuits", "Char Coal", "Coffee paymt", "Chips", "Chicken Nuggets", "Chicken", "Pudding Creams & Sauces", "Dairy Products", "Disposables", "Eggs", "English Vegitables", "Fish & Prawns", "Fried Onions", "Fruits", "Gas", "Ghee", "Grocessories", "Sunpure Oil", "House Keeping Material", "Ice Cream", "Ice Cubes", "Milk & Curd", "Mutton", "Natukodi", "Noodles", "Onion", "Paneer & Butter", "Pest Control Material", "Soft Drinks & Mineral Water", "Safron", "Sounf", "Printing & stationary", "Tea powder", "Vegetables", "Water Bubbles", "Water Tanker", "Uniform", "Cutlery", "AMB Mall", "Kondapur stores", "FNF Ventures", "DLF", "MKPT", "Kothaguda"
];

export default function Purchases({ dateRange, selectedBranch }) {
  const [purchases, setPurchases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState(defaultCategories);
  
  // Edit/Delete State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', date: '' });
  
  // Custom Toast state
  const [toast, setToast] = useState(null);

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDate, setBulkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkFile, setBulkFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  useEffect(() => {
    fetchPurchases();
  }, [dateRange, selectedBranch]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPurchases = async () => {
    try {
      const params = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
        branch: selectedBranch
      };
      const res = await axios.get(`${API_URL}/purchases`, { params });
      setPurchases(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    const isNew = !defaultCategories.find(c => c.toLowerCase() === formData.category.trim().toLowerCase());
    if (isNew && formData.category.trim() !== '') {
      setShowConfirmNew(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    try {
      const rawAmount = Number(formData.amount.replace(/,/g, ''));
      await axios.post(`${API_URL}/purchases`, {
        category: formData.category.trim(),
        amount: rawAmount,
        purchase_date: formData.date,
        description: formData.description,
        branch: selectedBranch
      });
      setShowModal(false);
      setShowConfirmNew(false);
      setFormData({ ...formData, amount: '', category: '', description: '' });
      fetchPurchases();
      showToast('Purchase logged successfully!');
    } catch (error) {
      console.error(error);
      showToast('Failed to add purchase', 'error');
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
      worksheet.eachRow((row, rowNumber) => {
        const category = row.getCell(1).text; // Column A
        const amountStr = row.getCell(2).text; // Column B
        
        if (category && amountStr) {
          const rawAmount = Number(amountStr.replace(/,/g, '').replace(/[^0-9.-]+/g,""));
          // Ensure it's a valid number and actually contains digits (skips headers)
          if (!isNaN(rawAmount) && amountStr.match(/[0-9]/)) {
            items.push({
              category: category.trim(),
              amount: rawAmount,
              purchase_date: bulkDate
            });
          }
        }
      });

      if (items.length === 0) {
        setIsImporting(false);
        return showToast('No valid data found. Ensure Col A is Type & Col B is Amount.', 'error');
      }

      await axios.post(`${API_URL}/purchases/bulk`, { items, branch: selectedBranch });
      setShowBulkModal(false);
      setBulkFile(null);
      fetchPurchases();
      showToast(`Successfully imported ${items.length} purchases!`);
    } catch (error) {
      console.error(error);
      showToast('Bulk import failed. Please check your Excel format.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // ----- EDIT / DELETE HANDLERS -----
  const openEditModal = (purchase) => {
    setSelectedPurchase(purchase);
    setEditForm({
      amount: Number(purchase.amount).toLocaleString('en-IN'),
      date: format(new Date(purchase.purchase_date), 'yyyy-MM-dd')
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const rawAmount = Number(editForm.amount.replace(/,/g, ''));
      await axios.put(`${API_URL}/purchases/aggregated`, {
        category: selectedPurchase.category,
        branch: selectedBranch,
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
        amount: rawAmount,
        purchase_date: editForm.date
      });
      showToast('Purchase updated successfully!');
      setShowEditModal(false);
      fetchPurchases();
    } catch (error) {
      console.error(error);
      showToast('Failed to update purchase', 'error');
    }
  };

  const confirmDelete = (purchase) => {
    setSelectedPurchase(purchase);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/purchases/aggregated`, {
        data: {
          category: selectedPurchase.category,
          branch: selectedBranch,
          startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
          endDate: format(dateRange.endDate, 'yyyy-MM-dd')
        }
      });
      showToast('Purchase deleted successfully!');
      setShowDeleteConfirm(false);
      fetchPurchases();
    } catch (error) {
      console.error(error);
      showToast('Failed to delete purchase', 'error');
    }
  };

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setFormData({ ...formData, amount: '' });
      return;
    }
    const formatted = Number(val).toLocaleString('en-IN');
    setFormData({ ...formData, amount: formatted });
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setFormData({...formData, category: val});
    setFilteredCategories(defaultCategories.filter(c => c.toLowerCase().includes(val.toLowerCase())));
    setShowDropdown(true);
  };

  const handleCategorySelect = (cat) => {
    setFormData({...formData, category: cat});
    setShowDropdown(false);
  };

  const displayedPurchases = purchases.filter(p => p.category.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalAmount = displayedPurchases.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 uppercase tracking-wide">Purchases</h2>
          <p className="text-brand-accent text-sm tracking-widest uppercase">Manage your purchases</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-dark-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="SEARCH ITEMS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-dark-bg border border-dark-border text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-primary w-full sm:w-64 uppercase placeholder:text-dark-muted"
            />
          </div>
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-dark-card hover:bg-dark-bg border border-dark-border text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-black/20 shrink-0"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-brand-primary/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>
      </div>

      {/* Total Banner */}
      <div className="bg-dark-card p-6 rounded-xl border border-dark-border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-400/20 text-orange-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Total Purchases</h3>
            <p className="text-xs text-dark-muted uppercase tracking-widest">{dateRange.label || 'Selected Period'}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-orange-400">
          ₹{totalAmount.toLocaleString('en-IN')}
        </p>
      </div>

      <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-dark-border bg-dark-bg/50">
              <th className="py-4 px-6 text-xs font-medium text-dark-muted uppercase tracking-wider">Date of Purchase</th>
              <th className="py-4 px-6 text-xs font-medium text-dark-muted uppercase tracking-wider">Type of Purchase</th>
              <th className="py-4 px-6 text-xs font-medium text-dark-muted uppercase tracking-wider">Additional Info</th>
              <th className="py-4 px-6 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Amount</th>
              <th className="py-4 px-6 text-xs font-medium text-dark-muted uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {displayedPurchases.map((purchase, index) => (
              <tr key={index} className="hover:bg-dark-bg/30 transition-colors">
                <td className="py-4 px-6 text-sm text-dark-text whitespace-nowrap">
                  <span className="text-[10px] text-dark-muted mr-2">LATEST:</span>
                  {format(new Date(purchase.purchase_date), 'MMM dd, yyyy').toUpperCase()}
                </td>
                <td className="py-4 px-6 text-sm">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-dark-bg border border-dark-border text-brand-accent uppercase tracking-wider">
                    {purchase.category}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-dark-muted max-w-md truncate uppercase">
                  {Number(purchase.entry_count) > 1 
                    ? <span className="text-brand-primary/70 font-semibold text-xs">MULTIPLE ENTRIES ({purchase.entry_count})</span> 
                    : '-'}
                </td>
                <td className="py-4 px-6 text-sm font-medium text-white text-right">
                  ₹{Number(purchase.amount).toLocaleString('en-IN')}
                </td>
                <td className="py-4 px-6 text-sm text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => openEditModal(purchase)} className="text-dark-muted hover:text-brand-primary transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => confirmDelete(purchase)} className="text-dark-muted hover:text-brand-danger transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {displayedPurchases.length === 0 && (
              <tr>
                <td colSpan="4" className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-dark-muted">
                    <Search className="w-8 h-8 mb-3 opacity-20" />
                    <p className="uppercase tracking-widest text-xs">No purchases found for this period.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Toast Notification */}
      {/* Edit Purchase Modal */}
      {showEditModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-dark-card rounded-2xl border border-dark-border w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Edit Purchase</h3>
                  <p className="text-xs text-brand-accent mt-1">{selectedPurchase.category}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-dark-muted hover:text-white p-1 bg-dark-bg rounded-md">&times;</button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-widest">Total Amount (₹)</label>
                  <input
                    type="text"
                    value={editForm.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEditForm({...editForm, amount: val ? Number(val).toLocaleString('en-IN') : ''});
                    }}
                    required
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-widest">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    required
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary uppercase"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-dark-border">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-dark-bg text-dark-muted hover:text-white py-3 rounded-lg border border-dark-border uppercase text-xs font-bold tracking-wider transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-brand-primary hover:bg-blue-600 text-white py-3 rounded-lg uppercase text-xs font-bold tracking-wider transition-colors">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && selectedPurchase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-dark-card p-6 rounded-2xl border border-dark-border w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-brand-danger/20 text-brand-danger flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wider">Delete Purchase?</h3>
            <p className="text-sm text-dark-muted mb-6 leading-relaxed uppercase tracking-wider">
              Are you sure you want to completely delete the <span className="text-white font-bold">{selectedPurchase.category}</span> purchase for this date range? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-dark-bg text-dark-muted hover:text-white font-medium py-2.5 rounded-lg border border-dark-border transition-colors text-xs uppercase tracking-wider">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 bg-brand-danger hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-colors text-xs uppercase tracking-wider shadow-lg shadow-brand-danger/20">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Bulk Import Purchases</h3>
                  <p className="text-xs text-dark-muted uppercase tracking-wider mt-1">Upload via Excel (.xlsx)</p>
                </div>
                <button onClick={() => {setShowBulkModal(false); setBulkFile(null);}} className="text-dark-muted hover:text-white p-1 bg-dark-bg rounded-md">&times;</button>
              </div>

              <div className="space-y-6">
                <div className="bg-brand-primary/10 border border-brand-primary/30 p-4 rounded-lg">
                  <p className="text-sm text-brand-primary leading-relaxed">
                    All items imported from this Excel sheet will be assigned to the date selected below. Format should be: <br/>
                    <span className="font-bold">Col A: Type of Purchase</span><br/>
                    <span className="font-bold">Col B: Amount</span>
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

      {/* Main Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-dark-card rounded-2xl border border-dark-border w-full max-w-md overflow-visible shadow-2xl animate-fade-in-up">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Add Purchase</h3>
                  <p className="text-xs text-dark-muted uppercase tracking-wider mt-1">Enter details below</p>
                </div>
                <button onClick={() => {setShowModal(false); setShowDropdown(false);}} className="text-dark-muted hover:text-white p-1 bg-dark-bg rounded-md">&times;</button>
              </div>

              <form onSubmit={handleInitialSubmit} className="space-y-5 relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Type of Purchase</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={handleCategoryChange}
                      onFocus={() => {
                        setFilteredCategories(defaultCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())));
                        setShowDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      required
                      placeholder="e.g. Milk, Gas"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary placeholder:text-dark-muted uppercase"
                    />
                    {showDropdown && filteredCategories.length > 0 && (
                      <div className="absolute top-[68px] left-0 right-0 max-h-48 overflow-y-auto bg-dark-bg border border-dark-border rounded-lg shadow-xl z-50 hide-scrollbar">
                        {filteredCategories.map(cat => (
                          <div 
                            key={cat} 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleCategorySelect(cat);
                            }}
                            className="px-4 py-2.5 text-sm text-white hover:bg-dark-card cursor-pointer border-b border-dark-border/50 last:border-0 uppercase"
                          >
                            {cat}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Amount (₹)</label>
                    <input
                      type="text"
                      value={formData.amount}
                      onChange={handleAmountChange}
                      required
                      placeholder="0"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary placeholder:text-dark-muted"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Date of Purchase</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-dark-muted uppercase tracking-widest">Additional Info</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter details..."
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary placeholder:text-dark-muted h-24 resize-none uppercase"
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {setShowModal(false); setShowDropdown(false);}}
                    className="flex-1 bg-dark-bg text-dark-muted hover:text-white font-medium py-3 rounded-lg border border-dark-border transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors text-xs uppercase tracking-wider"
                  >
                    Save Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for New Categories */}
      {showConfirmNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-dark-card p-6 rounded-2xl border border-dark-border w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wider">New Item Detected</h3>
            <p className="text-sm text-dark-muted mb-6 leading-relaxed uppercase tracking-wider">
              <span className="text-white font-bold">"{formData.category}"</span> is not in your standard list. Are you sure you want to log this as a new purchase type?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmNew(false)}
                className="flex-1 bg-dark-bg text-dark-muted hover:text-white font-medium py-2.5 rounded-lg border border-dark-border transition-colors text-xs uppercase tracking-wider"
              >
                No, Go Back
              </button>
              <button
                onClick={executeSubmit}
                className="flex-1 bg-brand-primary hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors text-xs uppercase tracking-wider shadow-lg shadow-brand-primary/20"
              >
                Yes, Add It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
