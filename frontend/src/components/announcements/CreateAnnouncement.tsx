import React, { useState } from 'react';
import { X, Save, Send, Eye } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Announcement } from './AnnouncementCard';

interface CreateAnnouncementProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (announcementData: CreateAnnouncementData) => Promise<void>;
  editingAnnouncement?: Announcement | null;
  loading?: boolean;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  status: 'draft' | 'published';
  target_audience: 'all' | 'employees' | 'hr' | 'managers' | 'department';
  scheduled_for?: string;
}

export function CreateAnnouncement({
  isOpen,
  onClose,
  onSubmit,
  editingAnnouncement = null,
  loading = false
}: CreateAnnouncementProps) {
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: editingAnnouncement?.title || '',
    content: editingAnnouncement?.content || '',
    priority: editingAnnouncement?.priority || 'normal',
    status: editingAnnouncement?.status === 'archived' ? 'published' : (editingAnnouncement?.status || 'draft'),
    target_audience: editingAnnouncement?.target_audience || 'all',
    scheduled_for: ''
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPreview, setShowPreview] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length > 5000) {
      newErrors.content = 'Content must be less than 5000 characters';
    }

    if (formData.scheduled_for && new Date(formData.scheduled_for) <= new Date()) {
      newErrors.scheduled_for = 'Scheduled time must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        status: 'draft',
        target_audience: 'all',
        scheduled_for: ''
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const handleInputChange = (field: keyof CreateAnnouncementData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Share important information with your team
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-lg transition-colors ${
                  showPreview
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : darkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
                title="Toggle Preview"
              >
                <Eye className="w-5 h-5" />
              </button>

              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-140px)]">
            {/* Form */}
            <div className={`flex-1 p-6 overflow-y-auto ${showPreview ? 'border-r' : ''} ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter announcement title..."
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                      errors.title 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                  )}
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formData.title.length}/200 characters
                  </p>
                </div>

                {/* Content */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Write your announcement content..."
                    rows={8}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors resize-none ${
                      errors.content 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                  {errors.content && (
                    <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                  )}
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formData.content.length}/5000 characters
                  </p>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Priority */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Target Audience
                    </label>
                    <select
                      value={formData.target_audience}
                      onChange={(e) => handleInputChange('target_audience', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    >
                      <option value="all">All Employees</option>
                      <option value="employees">Employees Only</option>
                      <option value="hr">HR Team</option>
                      <option value="managers">Managers</option>
                      <option value="department">Department</option>
                    </select>
                  </div>
                </div>

                {/* Schedule (only for drafts) */}
                {formData.status === 'draft' && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Schedule for Later (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_for}
                      onChange={(e) => handleInputChange('scheduled_for', e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        errors.scheduled_for 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                          : darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                    {errors.scheduled_for && (
                      <p className="text-red-500 text-sm mt-1">{errors.scheduled_for}</p>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className={`flex-1 p-6 overflow-y-auto ${
                darkMode ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Preview
                </h3>
                
                <div className={`rounded-lg border p-6 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  {/* Preview Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      A
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          You
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                          formData.priority === 'high' 
                            ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700'
                            : formData.priority === 'low'
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
                              : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                        }`}>
                          {formData.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Just now • {formData.target_audience === 'all' ? 'All Employees' : formData.target_audience}
                      </div>
                    </div>
                  </div>

                  {/* Preview Title */}
                  <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formData.title || 'Announcement Title'}
                  </h2>

                  {/* Preview Content */}
                  <div className={`prose max-w-none mb-4 ${darkMode ? 'prose-invert' : ''}`}>
                    <p className={`whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formData.content || 'Your announcement content will appear here...'}
                    </p>
                  </div>

                  {/* Preview Status */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        React
                      </span>
                    </div>
                    {formData.status === 'draft' && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between p-6 border-t ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === 'draft'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="text-blue-600"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Save as Draft
                </span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === 'published'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="text-blue-600"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Publish Now
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                  formData.status === 'published'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : formData.status === 'published' ? (
                  <Send className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {loading 
                    ? 'Saving...' 
                    : formData.status === 'published' 
                      ? (editingAnnouncement ? 'Update & Publish' : 'Publish') 
                      : (editingAnnouncement ? 'Update Draft' : 'Save Draft')
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}