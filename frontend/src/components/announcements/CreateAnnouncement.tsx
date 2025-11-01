import React, { useState, useEffect } from 'react';
import { X, Save, Send, Calendar, Users, AlertCircle, Clock, FileText } from 'lucide-react';
import { CreateAnnouncementRequest } from '../../types/announcement';

interface CreateAnnouncementProps {
  onSubmit: (data: CreateAnnouncementRequest, publish?: boolean) => Promise<void>;
  onClose: () => void;
  darkMode?: boolean;
  loading?: boolean;
  templates?: AnnouncementTemplate[];
}

interface AnnouncementTemplate {
  id: string;
  name: string;
  title_template: string;
  content_template: string;
  default_priority: string;
  category?: string;
}

const CreateAnnouncement: React.FC<CreateAnnouncementProps> = ({
  onSubmit,
  onClose,
  darkMode = false,
  loading = false,
  templates = []
}) => {
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: '',
    content: '',
    priority: 'medium',
    target_type: 'all',
    target_ids: [],
    scheduled_at: undefined,
    expires_at: undefined,
    metadata: {}
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setFormData(prev => ({
          ...prev,
          title: template.title_template,
          content: template.content_template,
          priority: template.default_priority as any,
          template_id: template.id
        }));
      }
    }
  }, [selectedTemplate, templates]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (isScheduled && formData.scheduled_at) {
      const scheduledDate = new Date(formData.scheduled_at);
      if (scheduledDate <= new Date()) {
        newErrors.scheduled_at = 'Scheduled date must be in the future';
      }
    }

    if (hasExpiry && formData.expires_at) {
      const expiryDate = new Date(formData.expires_at);
      const compareDate = formData.scheduled_at ? new Date(formData.scheduled_at) : new Date();
      if (expiryDate <= compareDate) {
        newErrors.expires_at = 'Expiry date must be after the scheduled date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (publish: boolean = false) => {
    if (!validateForm()) return;

    const submitData = {
      ...formData,
      scheduled_at: isScheduled ? formData.scheduled_at : undefined,
      expires_at: hasExpiry ? formData.expires_at : undefined
    };

    try {
      await onSubmit(submitData, publish);
      onClose();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleInputChange = (field: keyof CreateAnnouncementRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatDateTimeLocal = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Create New Announcement
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Use Template (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.category && `(${template.category})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter announcement title..."
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } ${errors.title ? 'border-red-500' : ''}`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Enter announcement content..."
              rows={6}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } ${errors.content ? 'border-red-500' : ''}`}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
            )}
          </div>

          {/* Priority and Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Target Audience
              </label>
              <select
                value={formData.target_type}
                onChange={(e) => handleInputChange('target_type', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Users</option>
                <option value="departments">Specific Departments</option>
                <option value="roles">Specific Roles</option>
                <option value="users">Specific Users</option>
              </select>
            </div>
          </div>

          {/* Scheduling Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="schedule"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="schedule" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Schedule for later
              </label>
            </div>

            {isScheduled && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formatDateTimeLocal(formData.scheduled_at ? new Date(formData.scheduled_at) : undefined)}
                  onChange={(e) => handleInputChange('scheduled_at', e.target.value ? new Date(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${errors.scheduled_at ? 'border-red-500' : ''}`}
                />
                {errors.scheduled_at && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.scheduled_at}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="expiry"
                checked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="expiry" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Set expiry date
              </label>
            </div>

            {hasExpiry && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Expiry Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formatDateTimeLocal(formData.expires_at ? new Date(formData.expires_at) : undefined)}
                  onChange={(e) => handleInputChange('expires_at', e.target.value ? new Date(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${errors.expires_at ? 'border-red-500' : ''}`}
                />
                {errors.expires_at && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.expires_at}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>

            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isScheduled ? (
                <Calendar className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isScheduled ? 'Schedule' : 'Publish Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAnnouncement;