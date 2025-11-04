import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Save, Eye, Archive, Trash2, MessageSquare, Users, Calendar, AlertCircle } from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import { useToast } from '../ui/Toast';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingButton from '../ui/LoadingButton';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { Announcement, CreateAnnouncementRequest, AnnouncementTemplate } from '../../types/announcement';

interface AnnouncementManagerProps {
  onClose?: () => void;
}

export const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'templates'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });
  
  // Form state for creating announcements
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: '',
    content: '',
    priority: 'normal',
    target_type: 'all',
    target_ids: [],
    scheduled_at: undefined,
    expires_at: undefined
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isDraft, setIsDraft] = useState(false);

  // Fetch announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements-manage'],
    queryFn: async () => {
      const response = await announcementService.getAnnouncements({}, 100, 0);
      return Array.isArray(response) ? response : [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['announcement-templates'],
    queryFn: async () => {
      const response = await announcementService.getTemplates();
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateAnnouncementRequest & { status?: string }) => {
      return await announcementService.createAnnouncement(data);
    },
    onSuccess: (data) => {
      addToast('success', isDraft ? 'Announcement saved as draft' : 'Announcement published successfully');
      queryClient.invalidateQueries({ queryKey: ['announcements-manage'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-announcements'] });
      resetForm();
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to create announcement');
    }
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await announcementService.deleteAnnouncement(id);
    },
    onSuccess: () => {
      addToast('success', 'Announcement deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['announcements-manage'] });
      setShowDeleteConfirm({ isOpen: false, id: '', title: '' });
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to delete announcement');
    }
  });

  // Publish announcement mutation
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await announcementService.publishAnnouncement(id);
    },
    onSuccess: () => {
      addToast('success', 'Announcement published successfully');
      queryClient.invalidateQueries({ queryKey: ['announcements-manage'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-announcements'] });
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to publish announcement');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      target_type: 'all',
      target_ids: [],
      scheduled_at: undefined,
      expires_at: undefined
    });
    setSelectedTemplate('');
    setIsDraft(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.title_template,
        content: template.content_template,
        priority: template.default_priority
      }));
      setSelectedTemplate(templateId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      addToast('error', 'Title and content are required');
      return;
    }

    const submitData = {
      ...formData,
      status: isDraft ? 'draft' : 'published'
    };

    createMutation.mutate(submitData);
  };

  const handleDelete = (announcement: Announcement) => {
    setShowDeleteConfirm({
      isOpen: true,
      id: announcement.id,
      title: announcement.title
    });
  };

  const confirmDelete = () => {
    if (showDeleteConfirm.id) {
      deleteMutation.mutate(showDeleteConfirm.id);
    }
  };

  const handlePublish = (id: string) => {
    publishMutation.mutate(id);
  };

  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'published':
        return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'draft':
        return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'scheduled':
        return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'archived':
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (priority) {
      case 'urgent':
        return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case 'high':
        return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`;
      case 'normal':
        return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'low':
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4`}>
      <div className={`max-w-6xl w-full max-h-[90vh] rounded-lg shadow-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Announcement Manager
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {[
            { id: 'create', label: 'Create Announcement', icon: Plus },
            { id: 'manage', label: 'Manage Announcements', icon: MessageSquare },
            { id: 'templates', label: 'Templates', icon: Archive }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === id
                  ? darkMode
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-750'
                    : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'create' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template Selection */}
              {templates && templates.length > 0 && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Use Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter announcement title..."
                  required
                />
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
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="Enter announcement content..."
                  required
                />
              </div>

              {/* Priority and Target */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Target Audience
                  </label>
                  <select
                    value={formData.target_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as any }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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

              {/* Expiration Date */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at ? new Date(formData.expires_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    expires_at: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDraft"
                    checked={isDraft}
                    onChange={(e) => setIsDraft(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isDraft" className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Save as draft
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-600 text-white hover:bg-gray-500'
                        : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                    }`}
                  >
                    Reset
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={createMutation.isPending}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    loadingText={isDraft ? "Saving..." : "Publishing..."}
                  >
                    {isDraft ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {isDraft ? 'Save Draft' : 'Publish Now'}
                  </LoadingButton>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              {announcementsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading announcements...
                  </p>
                </div>
              ) : announcements && announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`p-4 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-2 ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {announcement.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={getStatusBadge(announcement.status)}>
                            {announcement.status}
                          </span>
                          <span className={getPriorityBadge(announcement.priority)}>
                            {announcement.priority}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          By {announcement.author_name} • {new Date(announcement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {announcement.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(announcement.id)}
                            disabled={publishMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(announcement)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className={`text-sm line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {announcement.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${
                    darkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No announcements found
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              {templatesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading templates...
                  </p>
                </div>
              ) : templates && templates.length > 0 ? (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-2 ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {template.name}
                        </h3>
                        <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <strong>Title:</strong> {template.title_template}
                        </p>
                        <p className={`text-sm line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {template.content_template}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleTemplateSelect(template.id);
                          setActiveTab('create');
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Use
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Archive className={`w-12 h-12 mx-auto mb-4 ${
                    darkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No templates found
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm.isOpen}
        onClose={() => setShowDeleteConfirm({ isOpen: false, id: '', title: '' })}
        onConfirm={confirmDelete}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${showDeleteConfirm.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};