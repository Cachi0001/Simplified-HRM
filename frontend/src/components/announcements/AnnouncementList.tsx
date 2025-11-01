import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
import { AnnouncementCard, Announcement } from './AnnouncementCard';
import { useTheme } from '../../contexts/ThemeContext';

interface AnnouncementListProps {
  announcements: Announcement[];
  loading?: boolean;
  error?: string | null;
  onReact?: (announcementId: string, reactionType: string) => void;
  onRemoveReaction?: (announcementId: string) => void;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcementId: string) => void;
  onCreate?: () => void;
  onRefresh?: () => void;
  canCreate?: boolean;
  canEdit?: (announcement: Announcement) => boolean;
  canDelete?: (announcement: Announcement) => boolean;
  currentUserReactions?: { [announcementId: string]: string };
}

type FilterType = 'all' | 'published' | 'draft' | 'archived';
type PriorityFilter = 'all' | 'low' | 'normal' | 'high';
type SortType = 'newest' | 'oldest' | 'priority';

export function AnnouncementList({
  announcements,
  loading = false,
  error = null,
  onReact,
  onRemoveReaction,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
  canCreate = false,
  canEdit,
  canDelete,
  currentUserReactions = {}
}: AnnouncementListProps) {
  const { darkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort announcements
  const filteredAnnouncements = announcements
    .filter(announcement => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = announcement.title.toLowerCase().includes(query);
        const matchesContent = announcement.content.toLowerCase().includes(query);
        const matchesAuthor = announcement.author_name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent && !matchesAuthor) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && announcement.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && announcement.priority !== priorityFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'priority':
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          // If same priority, sort by newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || sortBy !== 'newest';

  if (error) {
    return (
      <div className={`rounded-lg border p-8 text-center ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">Failed to load announcements</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Announcements
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {filteredAnnouncements.length} of {announcements.length} announcements
          </p>
        </div>

        <div className="flex gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {canCreate && onCreate && (
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Announcement</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className={`p-4 rounded-lg border space-y-4 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterType)}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className={`rounded-lg border p-8 text-center ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading announcements...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAnnouncements.length === 0 && (
        <div className={`rounded-lg border p-8 text-center ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="font-medium">
              {hasActiveFilters ? 'No announcements match your filters' : 'No announcements yet'}
            </p>
            <p className="text-sm mt-1">
              {hasActiveFilters 
                ? 'Try adjusting your search or filter criteria'
                : canCreate 
                  ? 'Create your first announcement to get started'
                  : 'Check back later for new announcements'
              }
            </p>
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Clear filters
            </button>
          )}
          
          {!hasActiveFilters && canCreate && onCreate && (
            <button
              onClick={onCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Announcement
            </button>
          )}
        </div>
      )}

      {/* Announcements List */}
      {!loading && filteredAnnouncements.length > 0 && (
        <div className="space-y-6">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onReact={onReact}
              onRemoveReaction={onRemoveReaction}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit?.(announcement) || false}
              canDelete={canDelete?.(announcement) || false}
              currentUserReaction={currentUserReactions[announcement.id] || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}