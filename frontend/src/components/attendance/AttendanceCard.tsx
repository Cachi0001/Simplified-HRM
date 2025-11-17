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
  const lateMinutes = record.late_minutes || record.lateMinutes || 0;

  return (
    <div className={`p-3 sm:p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <Users className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-medium text-sm sm:text-base truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {getEmployeeName(record)}
              </p>
              {/* On-time/Late indicator next to name */}
              {(record.checkInTime || record.clock_in) && (
                isLate ? (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                    You are {formatLateTime(lateMinutes)}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                    On-time
                  </span>
                )
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className={`flex items-center gap-1 text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Calendar className="h-3 w-3" />
                {formatDate(record._id?.date ?? record.date)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${locationBadgeClass}`}>
                <MapPin className="h-3 w-3" />
                {locationLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
          <p className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {record.status === 'checked_out' || record.checkOutTime ? 'Completed' : 'Active'}
          </p>
          <div className={`flex items-center gap-1 sm:gap-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Clock className="h-3 w-3" />
            <span className="whitespace-nowrap">{formatTime(record.checkInTime || record.clock_in)}</span>
            {(record.checkOutTime || record.clock_out) ? (
              <>
                <span>-</span>
                <span className="whitespace-nowrap">{formatTime(record.checkOutTime || record.clock_out)}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                  {record.totalHours || record.hours_worked ? `${(record.totalHours || record.hours_worked).toFixed(1)}h` : '0h'}
                </span>
              </>
            ) : (
              <span className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-800'}`}>
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
