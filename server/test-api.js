async function check() {
  try {
    const res = await fetch('http://localhost:5001/api/sales/daily?startDate=2026-05-01&endDate=2026-05-31&branch=Golden%20Handi%20(G.H)&category=Online');
    const data = await res.json();
    console.log("Response:", data);
  } catch (e) {
    console.error(e.message);
  }
}
check();
