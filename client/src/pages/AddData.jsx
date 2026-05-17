import { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';

export default function AddData() {
  const [formData, setFormData] = useState({
    type: 'Tea Counter',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    subCategory: 'UPI'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const rawAmount = Number(formData.amount.replace(/,/g, ''));
      await axios.post(`${API_URL}/sales`, {
        category: formData.type,
        amount: rawAmount,
        sale_date: formData.date,
        sub_category: formData.subCategory
      });
      alert('Data added successfully');
      setFormData({ ...formData, amount: '' });
    } catch (error) {
      console.error(error);
      alert('Failed to add data');
    }
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    let subCategory = 'UPI';
    if (type === 'Online') subCategory = 'Swiggy';
    setFormData({ ...formData, type, subCategory });
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-dark-card border border-dark-border rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Log New Sale</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">Sale Type</label>
            <select
              value={formData.type}
              onChange={handleTypeChange}
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
                value={formData.amount}
                onChange={handleAmountChange}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-dark-muted uppercase tracking-wider">
              {formData.type === 'Online' ? 'Platform' : 'Mode of Payment'}
            </label>
            <select
              value={formData.subCategory}
              onChange={(e) => setFormData({...formData, subCategory: e.target.value})}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
            >
              {formData.type === 'Online' ? (
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

          <button
            type="submit"
            className="w-full bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Commit Sale
          </button>
        </form>
      </div>
    </div>
  );
}
