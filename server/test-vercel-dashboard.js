async function check() {
  try {
    const res = await fetch('https://golden-handi.vercel.app/api/dashboard/summary?startDate=2026-05-01&endDate=2026-05-31&branch=Golden%20Handi%20(G.H)');
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 500));
  } catch (e) {
    console.error(e.message);
  }
}
check();
