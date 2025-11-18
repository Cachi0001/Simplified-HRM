// This script demonstrates the late calculation logic
// Since we can't connect to production DB, we'll simulate it

console.log('📊 Late Calculation Verification\n');
console.log('═══════════════════════════════════════════════════\n');

function calculateLateStatus(clockInTime, lateThreshold = '09:00:00') {
  // Parse times
  const [clockHour, clockMin, clockSec] = clockInTime.split(':').map(Number);
  const [thresholdHour, thresholdMin, thresholdSec] = lateThreshold.split(':').map(Number);
  
  // Convert to minutes since midnight
  const clockInMinutes = clockHour * 60 + clockMin;
  const thresholdMinutes = thresholdHour * 60 + thresholdMin;
  
  const isLate = clockInMinutes > thresholdMinutes;
  const lateMinutes = isLate ? clockInMinutes - thresholdMinutes : 0;
  
  return {
    is_late: isLate,
    late_minutes: lateMinutes,
    status: isLate ? 'late' : 'on_time'
  };
}

console.log('OLD THRESHOLD (8:35 AM):');
console.log('─────────────────────────\n');

const oldThreshold = '08:35:00';
const testCases = [
  '08:30:00',
  '08:35:00',
  '09:00:00',
  '09:15:00',
  '10:20:00',
];

testCases.forEach(time => {
  const result = calculateLateStatus(time, oldThreshold);
  console.log(`  ${time}: ${result.is_late ? `❌ ${result.late_minutes} minutes late` : '✅ On time'}`);
});

console.log('\n\nNEW THRESHOLD (9:00 AM):');
console.log('─────────────────────────\n');

const newThreshold = '09:00:00';

testCases.forEach(time => {
  const result = calculateLateStatus(time, newThreshold);
  console.log(`  ${time}: ${result.is_late ? `❌ ${result.late_minutes} minutes late` : '✅ On time'}`);
});

console.log('\n\n📝 EXPLANATION:');
console.log('═══════════════════════════════════════════════════');
console.log('With OLD threshold (8:35 AM):');
console.log('  - Clocking in at 10:20 AM = 105 minutes late');
console.log('  - This is incorrect for standard office hours\n');

console.log('With NEW threshold (9:00 AM):');
console.log('  - Clocking in at 10:20 AM = 80 minutes late');
console.log('  - This is correct (1 hour 20 minutes late)\n');

console.log('✅ The fix has been applied to functions.sql');
console.log('⚠️  Backend needs to be redeployed for changes to take effect\n');
