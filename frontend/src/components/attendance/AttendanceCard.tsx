import { Users, Calendar, MapPin, Clock } from 'lucide-react';
import { formatLateTime } from '../../utils/timeUtils';

interface AttendanceCardProps {
  record: any;
  darkMode: boolean;
  getEmployeeName: (record: any) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  getLocationMeta: (record: any) => { status: string; distance: number | null };
}

export function AttendanceCard({
  record,
  darkMode,
  getEmployeeName,
  formatDate,
  formatTime,
  getLocationMeta
}: AttendanceCardProps) {

  const meta = getLocationMeta(record);
  const locationBadgeClass = meta.status === 'onsite'
    ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
    : meta.status === 'remote'
      ? darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-700'
      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700';
  const locationLabel = meta.status === 'onsite' ? 'Onsite' : meta.status === 'remote' ? 'Remote' : 'Unknown';
  
  const isLate = record.is_late || record.isLate;
  // WORKAROUND: Add 1 hour (60 minutes) to late_minutes to fix calculation bug
  const rawLateMinutes = record.late_minutes || record.lateMinutes || 0;
  const lateMinutes = rawLateMinutes + 60; // Add 1 hour workaround
  
  // Check if this is the current user's attendance
  const employeeName = getEmployeeName(record);
  const isOwnAttendance = employeeName === 'You';

  return (
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      {/* Mobile: Vertical layout, Desktop: Horizontal layout */}
      <div className="flex flex-col gap-3">
        {/* Top section: Icon, Name, and Late badge */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <Users className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-base mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {employeeName}
            </p>
            {/* Late/On-time badge - full width on mobile */}
            {(record.checkInTime || record.clock_in) && (
              isLate ? (
                <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                  {isOwnAttendance ? `You are ${formatLateTime(lateMinutes)}` : `${formatLateTime(lateMinutes)}`}
                </div>
              ) : (
                <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                  On-time
                </div>
              )
            )}
          </div>
        </div>

        {/* Middle section: Date and Location */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1.5 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Calendar className="h-4 w-4" />
            {formatDate(record._id?.date ?? record.date)}
          </span>
          <span className={`text-sm px-2 py-1 rounded-full inline-flex items-center gap-1.5 ${locationBadgeClass}`}>
            <MapPin className="h-4 w-4" />
            {locationLabel}
          </span>
        </div>

        {/* Bottom section: Status and Time */}
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {record.status === 'checked_out' || record.checkOutTime ? 'Completed' : 'Active'}
          </p>
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Clock className="h-4 w-4" />
            <span className="whitespace-nowrap">{formatTime(record.checkInTime || record.clock_in)}</span>
            {(record.checkOutTime || record.clock_out) ? (
              <>
                <span>-</span>
                <span className="whitespace-nowrap">{formatTime(record.checkOutTime || record.clock_out)}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                  {record.totalHours || record.hours_worked ? `${(record.totalHours || record.hours_worked).toFixed(1)}h` : '0h'}
                </span>
              </>
            ) : (
              <span className={`px-2 py-1 rounded text-xs font-medium ${darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-800'}`}>
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
