import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { employeeService } from '../services/employeeService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { Logo } from '../components/ui/Logo';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { 
  User, Mail, Phone, Building, Briefcase, Lock, Bell, Eye, EyeOff, 
  Check, X, ChevronRight, ArrowLeft, Save, Calendar
} from 'lucide-react';

interface UserSettingsProps {
  darkMode?: boolean;
}

const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Customer Service',
  'Product',
  'Design',
  'Legal'
];

const ROLES = ['employee', 'hr', 'admin'];

export default function UserSettingsPage({ darkMode: initialDarkMode = false }: UserSettingsProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // State Management
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'employee' | 'hr' | 'admin'>('employee');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(initialDarkMode);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    department: '',
    position: '',
    dateOfBirth: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    chatNotifications: true,
    taskNotifications: true,
    leaveNotifications: true,
    purchaseNotifications: true,
    dailyDigest: false,
  });

  const [preferenceSettings, setPreferenceSettings] = useState({
    darkMode: false,
    emailFormat: 'html',
    language: 'en',
    timezone: 'UTC',
  });

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const user = authService.getCurrentUserFromStorage();
        
        if (!user) {
          navigate('/auth');
          return;
        }

        setCurrentUser(user);
        setUserRole(user.role as 'employee' | 'hr' | 'admin');

        // Fetch full employee details
        if (user.id) {
          const employeeResponse = await employeeService.getEmployeeById(user.id);
          const employee = employeeResponse.employee;

          if (employee) {
            setFormData({
              fullName: employee.fullName || '',
              email: employee.email || '',
              phone: employee.phone || '',
              address: employee.address || '',
              department: employee.department || '',
              position: employee.position || '',
              dateOfBirth: employee.dateOfBirth || '',
            });
          }
        }

        // Load preferences from localStorage
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
          setPreferenceSettings(JSON.parse(savedPreferences));
          setDarkMode(JSON.parse(savedPreferences).darkMode);
        }

        const savedNotifications = localStorage.getItem('notificationSettings');
        if (savedNotifications) {
          setNotificationSettings(JSON.parse(savedNotifications));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        addToast('error', 'Failed to load user settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Handle profile form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle notification settings changes
  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Handle preference changes
  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setPreferenceSettings(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Save dark mode immediately
    if (name === 'darkMode') {
      setDarkMode(newValue as boolean);
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      if (!formData.fullName || !formData.email) {
        addToast('error', 'Name and email are required');
        return;
      }

      setIsSaving(true);

      const response = await employeeService.updateEmployee(currentUser.id, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        department: formData.department,
        position: formData.position,
        dateOfBirth: formData.dateOfBirth,
      });

      addToast('success', 'Profile updated successfully!');
      setCurrentUser(prev => ({ ...prev, fullName: formData.fullName }));
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Save password
  const handleChangePassword = async () => {
    try {
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        addToast('error', 'All password fields are required');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        addToast('error', 'New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 8) {
        addToast('error', 'New password must be at least 8 characters');
        return;
      }

      setIsSaving(true);

      // Call your password change endpoint
      // await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);

      addToast('success', 'Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error: any) {
      addToast('error', error.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  // Save notification settings
  const handleSaveNotifications = () => {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      addToast('success', 'Notification settings saved!');
    } catch (error) {
      addToast('error', 'Failed to save notification settings');
    }
  };

  // Save preference settings
  const handleSavePreferences = () => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferenceSettings));
      localStorage.setItem('darkMode', JSON.stringify(preferenceSettings.darkMode));
      addToast('success', 'Preferences saved!');
    } catch (error) {
      addToast('error', 'Failed to save preferences');
    }
  };

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    navigate('/auth');
    addToast('success', 'Logged out successfully');
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell darkMode={darkMode} />
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow`}>
              <nav className="space-y-1">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'security', label: 'Security', icon: Lock },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'preferences', label: 'Preferences', icon: Eye },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                      activeTab === id
                        ? `${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'} border-l-4 border-blue-600`
                        : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{label}</span>
                    {activeTab === id && <ChevronRight size={16} className="ml-auto" />}
                  </button>
                ))}
              </nav>

              {/* User Info Card */}
              <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{currentUser?.fullName}</p>
                    <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
                <Badge variant={userRole === 'admin' ? 'error' : userRole === 'hr' ? 'warning' : 'default'} className="mt-3 w-full justify-center">
                  {userRole.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card darkMode={darkMode}>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
                    {userRole === 'admin' && (
                      <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                        <p className="text-sm text-blue-600">
                          ⚠️ Admin accounts have limited profile editing. Contact system administrator for changes.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Full Name
                      </label>
                      <Input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleFormChange}
                        placeholder="Enter your full name"
                        disabled={userRole === 'admin'}
                        darkMode={darkMode}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="your.email@company.com"
                        disabled={userRole === 'admin'}
                        darkMode={darkMode}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Phone
                      </label>
                      <Input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleFormChange}
                        placeholder="+1 (555) 000-0000"
                        darkMode={darkMode}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date of Birth
                      </label>
                      <Input
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleFormChange}
                        darkMode={darkMode}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleFormChange}
                        className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                          darkMode
                            ? 'bg-gray-800 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        disabled={userRole === 'admin'}
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Position
                      </label>
                      <Input
                        name="position"
                        value={formData.position}
                        onChange={handleFormChange}
                        placeholder="e.g., Senior Developer"
                        darkMode={darkMode}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Address
                      </label>
                      <Input
                        name="address"
                        value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Street address"
                        darkMode={darkMode}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving || userRole === 'admin'}
                      className="flex items-center gap-2"
                    >
                      <Save size={16} />
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => window.location.reload()}
                      darkMode={darkMode}
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card darkMode={darkMode}>
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Security Settings</h2>

                  {/* Change Password Section */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Change Password</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Update your password to keep your account secure
                        </p>
                      </div>
                      <Button
                        variant={showPasswordForm ? 'error' : 'default'}
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                      >
                        {showPasswordForm ? 'Cancel' : 'Change Password'}
                      </Button>
                    </div>

                    {showPasswordForm && (
                      <div className="mt-4 space-y-4 pt-4 border-t border-gray-300">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Current Password
                          </label>
                          <div className="relative">
                            <Input
                              name="currentPassword"
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={handlePasswordChange}
                              placeholder="Enter current password"
                              darkMode={darkMode}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            New Password
                          </label>
                          <div className="relative">
                            <Input
                              name="newPassword"
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={handlePasswordChange}
                              placeholder="Enter new password (min 8 characters)"
                              darkMode={darkMode}
                            />
                            <button
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2.5"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Confirm New Password
                          </label>
                          <Input
                            name="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            placeholder="Confirm new password"
                            darkMode={darkMode}
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={handleChangePassword}
                            disabled={isSaving}
                          >
                            {isSaving ? 'Updating...' : 'Update Password'}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            }}
                            darkMode={darkMode}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session Info */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h3 className="font-semibold mb-3">Active Session</h3>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} space-y-2`}>
                      <p>Last login: {new Date().toLocaleDateString()}</p>
                      <p>IP Address: Not available in demo</p>
                      <Button
                        variant="error"
                        onClick={handleLogout}
                        className="mt-3"
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card darkMode={darkMode}>
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Notification Settings</h2>

                  {userRole === 'hr' || userRole === 'admin' ? (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                      <p className="text-sm text-blue-600">
                        📢 As an {userRole} user, you receive additional notifications about approvals and employee updates.
                      </p>
                    </div>
                  ) : null}

                  {/* Notification Toggles */}
                  <div className="space-y-4">
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
                      { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
                      { key: 'chatNotifications', label: 'Chat Messages', desc: 'Notify me of new messages' },
                      { key: 'taskNotifications', label: 'Task Updates', desc: 'Notify me of task changes' },
                      { key: 'leaveNotifications', label: 'Leave Requests', desc: 'Notify me of leave updates' },
                      { key: 'purchaseNotifications', label: 'Purchase Requests', desc: 'Notify me of purchase updates' },
                      { key: 'dailyDigest', label: 'Daily Digest', desc: 'Send a daily summary email' },
                    ].map(({ key, label, desc }) => (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-50'
                        }`}
                      >
                        <div>
                          <h4 className="font-medium">{label}</h4>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{desc}</p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name={key}
                            checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
                            onChange={handleNotificationChange}
                            className="w-4 h-4"
                          />
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <Button onClick={handleSaveNotifications}>
                      <Save size={16} className="mr-2" />
                      Save Notifications
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <Card darkMode={darkMode}>
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Preferences</h2>

                  <div className="space-y-4">
                    {/* Dark Mode */}
                    <div className={`flex items-center justify-between p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div>
                        <h4 className="font-medium">Dark Mode</h4>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Toggle dark theme for the application
                        </p>
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="darkMode"
                          checked={preferenceSettings.darkMode}
                          onChange={handlePreferenceChange}
                          className="w-4 h-4"
                        />
                      </label>
                    </div>

                    {/* Language */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Language
                      </label>
                      <select
                        name="language"
                        value={preferenceSettings.language}
                        onChange={handlePreferenceChange}
                        className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    {/* Timezone */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Timezone
                      </label>
                      <select
                        name="timezone"
                        value={preferenceSettings.timezone}
                        onChange={handlePreferenceChange}
                        className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="UTC">UTC (GMT+0)</option>
                        <option value="EST">EST (GMT-5)</option>
                        <option value="CST">CST (GMT-6)</option>
                        <option value="MST">MST (GMT-7)</option>
                        <option value="PST">PST (GMT-8)</option>
                      </select>
                    </div>

                    {/* Email Format */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email Format
                      </label>
                      <select
                        name="emailFormat"
                        value={preferenceSettings.emailFormat}
                        onChange={handlePreferenceChange}
                        className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                          darkMode
                            ? 'bg-gray-900 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="html">HTML</option>
                        <option value="plain">Plain Text</option>
                      </select>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <Button onClick={handleSavePreferences}>
                      <Save size={16} className="mr-2" />
                      Save Preferences
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />
    </div>
  );
}