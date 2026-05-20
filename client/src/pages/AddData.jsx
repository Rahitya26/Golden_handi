import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Upload, CheckCircle, XCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5001/api' : '/api';

export default function AddData({ dateRange, selectedBranch }) {
  const [sales, setSales] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Tea Counter');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // State
  const [toast, setToast] = useState(null);
  const [bulkDate, setBulkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkFile, setBulkFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    type: 'Tea Counter',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    subCategory: 'UPI'
  });

  const [editForm, setEditForm] = useState({
    date: '',
    values: {}
  });

  useEffect(() => {
    fetchSales();
  }, [dateRange, selectedBranch, activeCategory]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSales = async () => {
    try {
      const params = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
        branch: selectedBranch,
        category: activeCategory
      };
      const res = await axios.get(`${API_URL}/sales/daily`, { params });
      setSales(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ----- ADD SALE -----
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const rawAmount = Number(addForm.amount.replace(/,/g, ''));
      await axios.post(`${API_URL}/sales`, {
        category: addForm.type,
        amount: rawAmount,
        sale_date: addForm.date,
        sub_category: addForm.subCategory,
        branch: selectedBranch
      });
      showToast('Sale logged successfully!');
      setAddForm({ ...addForm, amount: '' });
      setShowAddModal(false);
      fetchSales();
    } catch (error) {
      console.error(error);
      showToast('Failed to log sale', 'error');
    }
  };

  const handleAddAmountChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAddForm({ ...addForm, amount: '' });
      return;
    }
    setAddForm({ ...addForm, amount: Number(val).toLocaleString('en-IN') });
  };

  const handleAddTypeChange = (e) => {
    const type = e.target.value;
    let subCategory = 'UPI';
    if (type === 'Online') subCategory = 'Swiggy';
    setAddForm({ ...addForm, type, subCategory });
  };

  // ----- EDIT SALE -----
  const openEditModal = (sale) => {
    const isOnline = activeCategory === 'Online';
    const initialValues = isOnline 
      ? { Swiggy: sale.Swiggy || 0, Zomato: sale.Zomato || 0 }
      : { Cash: sale.Cash || 0, Card: sale.Card || 0, UPI: sale.UPI || 0 };
    
    setEditForm({
      date: sale.sale_date,
      values: initialValues
    });
    setSelectedSale(sale);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Parse formatted strings back to numbers
      const parsedValues = {};
      for (const [key, val] of Object.entries(editForm.values)) {
        parsedValues[key] = Number(String(val).replace(/,/g, ''));
      }

      await axios.put(`${API_URL}/sales/daily`, {
        sale_date: editForm.date,
        category: activeCategory,
        branch: selectedBranch,
        updates: parsedValues
      });
      showToast('Sale updated successfully!');
      setShowEditModal(false);
      fetchSales();
    } catch (error) {
      console.error(error);
      showToast('Failed to update sale', 'error');
    }
  };

  const handleEditValueChange = (key, val) => {
    const numericVal = val.replace(/\D/g, '');
    const formatted = numericVal ? Number(numericVal).toLocaleString('en-IN') : '';
    setEditForm({
      ...editForm,
      values: { ...editForm.values, [key]: formatted }
    });
  };

  // ----- DELETE SALE -----
  const confirmDelete = (sale) => {
    setSelectedSale(sale);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/sales/daily`, {
        data: {
          sale_date: selectedSale.sale_date,
          category: activeCategory,
          branch: selectedBranch
        }
      });
      showToast('Sale deleted successfully!');
      setShowDeleteConfirm(false);
      fetchSales();
    } catch (error) {
      console.error(error);
      showToast('Failed to delete sale', 'error');
    }
  };

  // ----- BULK IMPORT -----
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

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          mappings.forEach(mapping => {
            const subCat = row.getCell(mapping.index).text;
            const amountStr = row.getCell(mapping.index + 1).text;
            
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

      await axios.post(`${API_URL}/sales/bulk`, { items, branch: selectedBranch });
      setShowBulkModal(false);
      setBulkFile(null);
      showToast(`Successfully imported ${items.length} sales!`);
      fetchSales();
    } catch (error) {
      console.error(error);
      showToast('Bulk import failed. Please check your Excel format.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const isOnline = activeCategory === 'Online';
  const columns = isOnline 
    ? ['Sale Date', 'Swiggy', 'Zomato', 'Total Sale', 'Actions'] 
    : ['Sale Date', 'Cash', 'Card', 'UPI', 'Total', 'Actions'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 uppercase tracking-wide">Sales</h2>
          <p className="text-brand-accent text-sm tracking-widest uppercase">Manage your daily sales</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-dark-card hover:bg-dark-bg border border-dark-border text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-black/20 shrink-0"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => {
              setAddForm({ ...addForm, type: activeCategory, subCategory: isOnline ? 'Swiggy' : 'UPI' });
              setShowAddModal(true);
            }}
            className="bg-brand-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-brand-primary/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add New Sale
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-2 bg-dark-card p-2 rounded-xl border border-dark-border overflow-x-auto">
        {['Tea Counter', 'Restaurant', 'Online'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeCategory === cat 
                ? 'bg-brand-primary text-white shadow-lg' 
                : 'text-dark-muted hover:text-white hover:bg-dark-bg'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sales Table */}
      <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg/50">
                {columns.map((col, idx) => (
                  <th key={col} className={`py-4 px-6 text-xs font-medium text-dark-muted uppercase tracking-wider ${idx > 0 && idx < columns.length - 1 ? 'text-right' : ''} ${idx === columns.length - 1 ? 'text-center' : ''}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {sales.map((sale, index) => (
                <tr key={index} className="hover:bg-dark-bg/30 transition-colors">
                  <td className="py-4 px-6 text-sm text-white font-medium whitespace-nowrap">
                    {format(new Date(sale.sale_date), 'MMM dd, yyyy').toUpperCase()}
                  </td>
                  {isOnline ? (
                    <>
                      <td className="py-4 px-6 text-sm text-dark-muted text-right">₹{Number(sale.Swiggy || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6 text-sm text-dark-muted text-right">₹{Number(sale.Zomato || 0).toLocaleString('en-IN')}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-4 px-6 text-sm text-dark-muted text-right">₹{Number(sale.Cash || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6 text-sm text-dark-muted text-right">₹{Number(sale.Card || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6 text-sm text-dark-muted text-right">₹{Number(sale.UPI || 0).toLocaleString('en-IN')}</td>
                    </>
                  )}
                  <td className="py-4 px-6 text-sm font-bold text-brand-accent text-right">
                    ₹{Number(sale.total).toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-6 text-sm text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEditModal(sale)} className="text-dark-muted hover:text-brand-primary transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmDelete(sale)} className="text-dark-muted hover:text-brand-danger transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center">
                    <p className="text-dark-muted uppercase tracking-widest text-xs">No sales found for this period.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-dark-card rounded-2xl border border-dark-border w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Log New Sale</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-dark-muted hover:text-white p-1 bg-dark-bg rounded-md">&times;</button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">Sale Type</label>
                  <select
                    value={addForm.type}
                    onChange={handleAddTypeChange}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                  >
                    <option value="Tea Counter">Tea Counter</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">Amount (₹)</label>
                    <input
                      type="text"
                      value={addForm.amount}
                      onChange={handleAddAmountChange}
                      required
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={addForm.date}
                      onChange={(e) => setAddForm({...addForm, date: e.target.value})}
                      required
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">
                    {addForm.type === 'Online' ? 'Platform' : 'Mode of Payment'}
                  </label>
                  <select
                    value={addForm.subCategory}
                    onChange={(e) => setAddForm({...addForm, subCategory: e.target.value})}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                  >
                    {addForm.type === 'Online' ? (
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

                <button type="submit" className="w-full bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors uppercase tracking-wider mt-4">
                  Commit Sale
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-dark-card rounded-2xl border border-dark-border w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Edit {activeCategory}</h3>
                  <p className="text-xs text-brand-accent mt-1">{format(new Date(editForm.date), 'MMMM dd, yyyy').toUpperCase()}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-dark-muted hover:text-white p-1 bg-dark-bg rounded-md">&times;</button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="space-y-4">
                  {Object.keys(editForm.values).map(key => (
                    <div key={key} className="space-y-2">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-widest">{key} Amount (₹)</label>
                      <input
                        type="text"
                        value={editForm.values[key]}
                        onChange={(e) => handleEditValueChange(key, e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                        placeholder="0"
                      />
                    </div>
                  ))}
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
      {showDeleteConfirm && selectedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-dark-card p-6 rounded-2xl border border-dark-border w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-brand-danger/20 text-brand-danger flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wider">Delete Sale Record?</h3>
            <p className="text-sm text-dark-muted mb-6 leading-relaxed uppercase tracking-wider">
              Are you sure you want to completely delete all <span className="text-white font-bold">{activeCategory}</span> sales for <span className="text-white font-bold">{format(new Date(selectedSale.sale_date), 'MMM dd, yyyy')}</span>? This cannot be undone.
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
                    The system will scan Row 1 for <span className="font-bold text-white">Tea</span>, <span className="font-bold text-white">Restaurant</span>, or <span className="font-bold text-white">Online</span> headers, and extract the sub-category and amount automatically.
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
                  <button onClick={() => {setShowBulkModal(false); setBulkFile(null);}} className="flex-1 bg-dark-bg text-dark-muted hover:text-white font-medium py-3 rounded-lg border border-dark-border transition-colors text-xs uppercase tracking-wider">
                    Cancel
                  </button>
                  <button onClick={handleBulkImport} disabled={isImporting || !bulkFile} className="flex-1 bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                    {isImporting ? 'Importing...' : 'Start Import'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border shadow-2xl ${
            toast.type === 'error' ? 'bg-brand-danger/10 border-brand-danger/30 text-brand-danger' : 'bg-brand-success/10 border-brand-success/30 text-brand-success'
          }`}>
            {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="text-sm font-bold uppercase tracking-wider">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
