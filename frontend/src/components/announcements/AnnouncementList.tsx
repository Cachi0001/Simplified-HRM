import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { Announcement, AnnouncementFilters } from '../../types/announcement';
import { useAuth } from '../../contexts/AuthContext';

interface AnnouncementListProps {
  announcements: Announcement[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onCreateNew?: () => void;
  onReaction?: (announcementId: string, reactionType: string) => void;
  onMarkAsRead?: (announcementId: string) => void;
  onFiltersChange?: (filters: AnnouncementFilters) => void;
  darkMode?: boolean;
  canCreate?: boolean;
}

const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  loading = false,
  error,
  onRefresh,
  onCreateNew,
  onReaction,
  onMarkAsRead,
  onFiltersChange,
  darkMode = false,
  canCreate = false
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  // Apply filters whenever they change
  useEffect(() => {
    if (onFiltersChange) {
      const filters: AnnouncementFilters = {};
      
      if (searchTerm) filters.search = searchTerm;
      if (selectedPriority) filters.priority = [selectedPriority];
      if (selectedStatus) filters.status = [selectedStatus];

      onFiltersChange(filters);
    }
  }, [searchTerm, selectedPriority, selectedStatus, onFiltersChange]);

  const filteredAndSortedAnnouncements = React.useMemo(() => {
    let filtered = [...announcements];

    // Apply local filtering if no server-side filtering
    if (!onFiltersChange) {
      if (searchTerm) {
        filtered = filtered.filter(announcement =>
          announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (selectedPriority) {
        filtered = filtered.filter(announcement => announcement.priority === selectedPriority);
      }

      if (selectedStatus) {
        filtered = filtered.filter(announcement => announcement.status === selectedStatus);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
        case 'oldest':
          return new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [announcements, searchTerm, selectedPriority, selectedStatus, sortBy, onFiltersChange]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPriority('');
    setSelectedStatus('');
  };

  const hasActiveFilters = searchTerm || selectedPriority || selectedStatus;

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Announcements
          </h2>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } ${loading ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            {canCreate && onCreateNew && (
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Announcement
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Filter Toggle and Sort */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${hasActiveFilters ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {[searchTerm, selectedPriority, selectedStatus].filter(Boolean).length}
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'priority')}
              className={`px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">By Priority</option>
            </select>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Priority
                  </label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Status</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft</option>
                    <option value="expired">Expired</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                  <button
                    onClick={clearFilters}
                    className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className={`mb-4 p-4 rounded-lg border ${darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className={`rounded-lg border p-4 animate-pulse ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-6 w-16 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  <div className={`h-4 w-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                </div>
                <div className={`h-6 w-3/4 rounded mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className={`h-4 w-full rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className={`h-4 w-2/3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedAnnouncements.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No announcements found</h3>
            <p className="text-sm">
              {hasActiveFilters 
                ? 'Try adjusting your filters to see more results.' 
                : 'There are no announcements to display at the moment.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`mt-3 text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onReaction={onReaction}
                onMarkAsRead={onMarkAsRead}
                darkMode={darkMode}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementList;