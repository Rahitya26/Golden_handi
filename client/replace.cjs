const fs = require('fs');
const files = [
  'd:/Golden Handi/client/src/pages/Dashboard.jsx',
  'd:/Golden Handi/client/src/pages/AddData.jsx',
  'd:/Golden Handi/client/src/pages/Expenses.jsx',
  'd:/Golden Handi/client/src/pages/Purchases.jsx'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/const API_URL = import\.meta\.env\.PROD \? '\/api' : 'http:\/\/localhost:5001\/api';/g, "const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5001/api' : '/api';");
  fs.writeFileSync(f, c);
});
console.log('Replaced successfully');
