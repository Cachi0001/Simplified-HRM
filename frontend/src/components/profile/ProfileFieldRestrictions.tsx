import React from 'react';
import { Info, Lock, AlertTriangle } from 'lucide-react';

interface ProfileFieldRestrictionsProps {
  userRole: 'employee' | 'hr' | 'admin' | 'superadmin';
  darkMode?: boolean;
}

export const ProfileFieldRestrictions: React.FC<ProfileFieldRestrictionsProps> = ({
  userRole,
  darkMode = false
}) => {
  const getFieldRestrictions = () => {
    switch (userRole) {
      case 'employee':
        return {
          allowed: ['Full Name', 'Phone', 'Address', 'Date of Birth', 'Profile Picture', 'Position'],
          restricted: ['Department', 'Role'],
          requiresApproval: ['Department changes', 'Position changes (significant)']
        };
      case 'hr':
        return {
          allowed: ['All fields'],
          restricted: [],
          requiresApproval: []
        };
      case 'admin':
      case 'superadmin':
        return {
          allowed: ['All fields'],
          restricted: [],
          requiresApproval: []
        };
      default:
        return {
          allowed: [],
          restricted: ['All fields'],
          requiresApproval: []
        };
    }
  };

  const restrictions = getFieldRestrictions();

  if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'hr') {
    return (
      <div className={`p-4 rounded-lg border ${
        darkMode
          ? 'bg-green-900/20 border-green-700 text-green-200'
          : 'bg-green-50 border-green-200 text-green-800'
      }`}>
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium">Full Access</h4>
            <p className="text-sm mt-1">
              As {userRole === 'hr' ? 'an HR' : `an ${userRole}`}, you have full access to edit all profile fields.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Allowed Fields */}
      {restrictions.allowed.length > 0 && (
        <div className={`p-3 rounded-lg border ${
          darkMode
            ? 'bg-blue-900/20 border-blue-700 text-blue-200'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-sm">You can edit:</h5>
              <p className="text-xs mt-1">
                {restrictions.allowed.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Restricted Fields */}
      {restrictions.restricted.length > 0 && (
        <div className={`p-3 rounded-lg border ${
          darkMode
            ? 'bg-red-900/20 border-red-700 text-red-200'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start space-x-2">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-sm">Restricted fields:</h5>
              <p className="text-xs mt-1">
                {restrictions.restricted.join(', ')} - Contact HR/Admin for changes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approval Required */}
      {restrictions.requiresApproval.length > 0 && (
        <div className={`p-3 rounded-lg border ${
          darkMode
            ? 'bg-yellow-900/20 border-yellow-700 text-yellow-200'
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-sm">Requires approval:</h5>
              <p className="text-xs mt-1">
                {restrictions.requiresApproval.join(', ')} - Changes will be reviewed
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
