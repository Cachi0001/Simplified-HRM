import React from 'react';
import { DepartmentManager } from '../departments/DepartmentManager';

interface AdminDepartmentsProps {
  darkMode?: boolean;
  currentUser?: any;
}

export function AdminDepartments({ darkMode = false, currentUser }: AdminDepartmentsProps) {
  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <DepartmentManager currentUser={currentUser} />
    </div>
  );
}
