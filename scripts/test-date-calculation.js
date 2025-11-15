// Test date calculation logic - WEEKDAYS ONLY

function calculateDays(startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  let weekdays = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday - exclude these
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      weekdays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return weekdays;
}

console.log('Testing date calculations:\n');

// Test cases (WEEKDAYS ONLY)
// Nov 2025: 16=Sun, 17=Mon, 18=Tue, 19=Wed, 20=Thu, 21=Fri, 22=Sat, 23=Sun, 24=Mon, 25=Tue
const tests = [
  { start: '2025-11-16', end: '2025-11-25', expected: 6, note: 'Sun-Tue (excludes Sun 16, Sat 22, Sun 23)' },
  { start: '2025-11-17', end: '2025-11-21', expected: 5, note: 'Mon-Fri (full week)' },
  { start: '2025-11-17', end: '2025-11-20', expected: 4, note: 'Mon-Thu' },
  { start: '2025-11-14', end: '2025-11-20', expected: 5, note: 'Fri-Thu (excludes Sat 15, Sun 16)' },
  { start: '2025-11-17', end: '2025-11-17', expected: 1, note: 'Monday only' },
  { start: '2025-11-16', end: '2025-11-16', expected: 0, note: 'Sunday only (weekend)' },
  { start: '2025-11-22', end: '2025-11-23', expected: 0, note: 'Sat-Sun (full weekend)' },
];

tests.forEach(test => {
  const calculated = calculateDays(test.start, test.end);
  const status = calculated === test.expected ? '✅' : '❌';
  console.log(`${status} ${test.start} to ${test.end}: ${calculated} weekdays (expected ${test.expected})`);
  if (test.note) console.log(`   ${test.note}`);
});

console.log('\n📅 Note: Calculation counts WEEKDAYS ONLY (Mon-Fri)');
console.log('Weekends (Saturday & Sunday) are excluded from leave days');
