import React, { useState } from 'react';
import { Clock, User, AlertCircle, CheckCircle, Calendar, Eye } from 'lucide-react';
import { Announcement } from '../../types/announcement';
import { ReactionButton } from '../reactions';

interface AnnouncementCardProps {
  announcement: Announcement;
  onReaction?: (announcementId: string, reactionType: string) => void;
  onMarkAsRead?: (announcementId: string) => void;
  darkMode?: boolean;
  currentUserId?: string;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onReaction,
  onMarkAsRead,
  darkMode = false,
  currentUserId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <CheckCircle className="w-4 h-4" />;
      case 'low':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkAsRead = () => {
    if (onMarkAsRead && !announcement.is_read) {
      onMarkAsRead(announcement.id);
    }
  };

  const handleReaction = (reactionType: string) => {
    if (onReaction) {
      onReaction(announcement.id, reactionType);
    }
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className={`rounded-lg border p-4 mb-4 transition-all duration-200 hover:shadow-md ${
        darkMode 
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      } ${!announcement.is_read ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}`}
      onClick={handleMarkAsRead}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
              {getPriorityIcon(announcement.priority)}
              {announcement.priority.toUpperCase()}
            </span>
            {!announcement.is_read && (
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {announcement.title}
          </h3>
        </div>
      </div>

      {/* Author and Date */}
      <div className={`flex items-center gap-4 mb-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          <span>{announcement.author_name || 'Unknown Author'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(announcement.published_at || announcement.created_at)}</span>
        </div>
        {announcement.expires_at && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Expires: {formatDate(announcement.expires_at)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <p className="whitespace-pre-wrap">
          {isExpanded ? announcement.content : truncateContent(announcement.content)}
        </p>
        {announcement.content.length > 200 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`mt-2 text-sm font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Target Audience */}
      {announcement.target_type !== 'all' && (
        <div className={`mb-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span className="font-medium">Target: </span>
          <span className="capitalize">{announcement.target_type}</span>
          {announcement.target_ids && announcement.target_ids.length > 0 && (
            <span> ({announcement.target_ids.length} selected)</span>
          )}
        </div>
      )}

      {/* Reactions and Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          {/* Reaction Component */}
          <div onClick={(e) => e.stopPropagation()}>
            <ReactionButton
              reactions={announcement.reaction_counts || {}}
              userReaction={announcement.user_reaction}
              onReactionSelect={handleReaction}
              darkMode={darkMode}
              size="sm"
            />
          </div>

          {/* Read Count */}
          <div className={`flex items-center gap-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Eye className="w-4 h-4" />
            <span>{announcement.read_count || 0} read</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            announcement.status === 'published' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : announcement.status === 'scheduled'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {announcement.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;