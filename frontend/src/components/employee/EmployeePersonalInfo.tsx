import { User, Mail, Phone, MapPin, Calendar, Briefcase, Building } from 'lucide-react';
import { Card } from '../ui/Card';

interface EmployeePersonalInfoProps {
  employee: {
    full_name?: string;
    email: string;
    phone?: string;
    address?: string;
    date_of_birth?: string;
    position?: string;
    department?: string;
    hire_date?: string;
    role?: string;
  };
  darkMode?: boolean;
  currentUserRole?: string;
}

export function EmployeePersonalInfo({ employee, darkMode = false, currentUserRole }: EmployeePersonalInfoProps) {
  const formatDate = (date?: string) => {
    if (!date) return 'Not provided';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Hide superadmin personal info from non-superadmins
  const isHidden = employee.role === 'superadmin' && currentUserRole !== 'superadmin';

  const infoItems = [
    {
      icon: User,
      label: 'Full Name',
      value: isHidden ? '[Hidden]' : (employee.full_name || 'Not provided'),
      hidden: false
    },
    {
      icon: Mail,
      label: 'Email',
      value: employee.email,
      hidden: false
    },
    {
      icon: Phone,
      label: 'Phone',
      value: isHidden ? '[Hidden]' : (employee.phone || 'Not provided'),
      hidden: isHidden
    },
    {
      icon: MapPin,
      label: 'Address',
      value: isHidden ? '[Hidden]' : (employee.address || 'Not provided'),
      hidden: isHidden
    },
    {
      icon: Calendar,
      label: 'Date of Birth',
      value: isHidden ? '[Hidden]' : formatDate(employee.date_of_birth),
      hidden: isHidden
    },
    {
      icon: Briefcase,
      label: 'Position',
      value: employee.position || 'Not assigned',
      hidden: false
    },
    {
      icon: Building,
      label: 'Department',
      value: employee.department || 'Not assigned',
      hidden: false
    },
    {
      icon: Calendar,
      label: 'Hire Date',
      value: formatDate(employee.hire_date),
      hidden: false
    }
  ];

  return (
    <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Personal Information
          </h3>
          {isHidden && (
            <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
              Privacy Protected
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {infoItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {item.label}
                  </p>
                  <p className={`text-sm sm:text-base mt-1 ${
                    item.hidden 
                      ? (darkMode ? 'text-gray-500 italic' : 'text-gray-400 italic')
                      : (darkMode ? 'text-white' : 'text-gray-900')
                  } break-words`}>
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {isHidden && (
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} italic`}>
              * Some personal information is hidden for privacy reasons
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
