import React, { useState } from 'react';
import { Clock, User, Heart, ThumbsUp, Smile, Frown, Eye, MoreHorizontal, MessageCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_email: string;
  priority: 'low' | 'normal' | 'high';
  status: 'draft' | 'published' | 'archived';
  target_audience: 'all' | 'employees' | 'hr' | 'managers' | 'department';
  created_at: string;
  updated_at?: string;
  reactions?: {
    counts: { [key: string]: number };
    users: { [key: string]: any[] };
    totalReactions: number;
  };
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onReact?: (announcementId: string, reactionType: string) => void;
  onRemoveReaction?: (announcementId: string) => void;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcementId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  currentUserReaction?: string | null;
}

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠'
};

const priorityColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-red-100 text-red-800 border-red-200'
};

const priorityColorsDark = {
  low: 'bg-green-900 text-green-200 border-green-700',
  normal: 'bg-blue-900 text-blue-200 border-blue-700',
  high: 'bg-red-900 text-red-200 border-red-700'
};

export function AnnouncementCard({
  announcement,
  onReact,
  onRemoveReaction,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  currentUserReaction = null
}: AnnouncementCardProps) {
  const { darkMode } = useTheme();
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleReaction = (reactionType: string) => {
    if (currentUserReaction === reactionType) {
      // Remove reaction if clicking the same one
      onRemoveReaction?.(announcement.id);
    } else {
      // Add or change reaction
      onReact?.(announcement.id, reactionType);
    }
    setShowReactions(false);
  };

  const totalReactions = announcement.reactions?.totalReactions || 0;
  const reactionCounts = announcement.reactions?.counts || {};

  return (
    <div className={`rounded-lg border p-6 transition-all duration-200 hover:shadow-md ${
      darkMode 
        ? 'bg-gray-800 border-gray-700 hover:shadow-gray-900/20' 
        : 'bg-white border-gray-200 hover:shadow-gray-200/50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Author Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
            {announcement.author_name?.charAt(0).toUpperCase() || 'A'}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {announcement.author_name}
              </h3>
              
              {/* Priority Badge */}
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                darkMode ? priorityColorsDark[announcement.priority] : priorityColors[announcement.priority]
              }`}>
                {announcement.priority.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatDate(announcement.created_at)}</span>
              {announcement.target_audience !== 'all' && (
                <>
                  <span>•</span>
                  <span className="capitalize">{announcement.target_audience}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        {(canEdit || canDelete) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className={`absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-10 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                {canEdit && (
                  <button
                    onClick={() => {
                      onEdit?.(announcement);
                      setShowMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      darkMode 
                        ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                        : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    Edit Announcement
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      onDelete?.(announcement.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete Announcement
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {announcement.title}
      </h2>

      {/* Content */}
      <div className={`prose max-w-none mb-4 ${darkMode ? 'prose-invert' : ''}`}>
        <p className={`whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {announcement.content}
        </p>
      </div>

      {/* Reactions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          {/* Reaction Button */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentUserReaction
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {currentUserReaction ? (
                <span className="text-lg">{reactionEmojis[currentUserReaction as keyof typeof reactionEmojis]}</span>
              ) : (
                <ThumbsUp className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">
                {currentUserReaction ? 'Reacted' : 'React'}
              </span>
            </button>

            {/* Reaction Picker */}
            {showReactions && (
              <div className={`absolute bottom-full left-0 mb-2 p-2 rounded-lg border shadow-lg z-10 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex gap-1">
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className={`p-2 rounded-lg text-xl transition-all hover:scale-110 ${
                        currentUserReaction === type
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={type}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reaction Count */}
          {totalReactions > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {Object.entries(reactionCounts).slice(0, 3).map(([type, count]) => (
                  count > 0 && (
                    <span
                      key={type}
                      className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm border-2 border-white dark:border-gray-800"
                    >
                      {reactionEmojis[type as keyof typeof reactionEmojis]}
                    </span>
                  )
                ))}
              </div>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {totalReactions}
              </span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {announcement.status === 'draft' && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              Draft
            </span>
          )}
          {announcement.status === 'archived' && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showReactions || showMenu) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowReactions(false);
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}