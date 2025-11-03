import React, { useState } from 'react';
import { Heart, ThumbsUp, Laugh, Smile, Frown, Angry, CheckCircle, Users } from 'lucide-react';

interface ReactionCounts {
  like?: number;
  love?: number;
  laugh?: number;
  wow?: number;
  sad?: number;
  angry?: number;
  acknowledge?: number;
}

interface ReactionDisplayProps {
  reactions: ReactionCounts;
  userReaction?: string;
  onReactionClick?: (reactionType: string) => void;
  onReactionHover?: (reactionType: string | null) => void;
  darkMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  maxVisible?: number;
}

const reactionConfig = {
  like: { icon: ThumbsUp, emoji: '👍', label: 'Like', color: 'text-blue-600 dark:text-blue-400' },
  love: { icon: Heart, emoji: '❤️', label: 'Love', color: 'text-red-600 dark:text-red-400' },
  laugh: { icon: Laugh, emoji: '😂', label: 'Laugh', color: 'text-yellow-600 dark:text-yellow-400' },
  wow: { icon: Smile, emoji: '😮', label: 'Wow', color: 'text-purple-600 dark:text-purple-400' },
  sad: { icon: Frown, emoji: '😢', label: 'Sad', color: 'text-gray-600 dark:text-gray-400' },
  angry: { icon: Angry, emoji: '😠', label: 'Angry', color: 'text-red-700 dark:text-red-500' },
  acknowledge: { icon: CheckCircle, emoji: '✅', label: 'Acknowledge', color: 'text-green-600 dark:text-green-400' }
};

const ReactionDisplay: React.FC<ReactionDisplayProps> = ({
  reactions,
  userReaction,
  onReactionClick,
  onReactionHover,
  darkMode = false,
  size = 'md',
  showCounts = true,
  maxVisible = 3
}) => {
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  // Filter reactions that have counts > 0
  const activeReactions = Object.entries(reactions)
    .filter(([_, count]) => count && count > 0)
    .sort(([, a], [, b]) => (b || 0) - (a || 0)); // Sort by count descending

  if (activeReactions.length === 0) {
    return null;
  }

  const visibleReactions = activeReactions.slice(0, maxVisible);
  const hiddenCount = activeReactions.length - maxVisible;
  const totalReactions = activeReactions.reduce((sum, [, count]) => sum + (count || 0), 0);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'gap-1',
          reaction: 'p-1',
          emoji: 'text-sm',
          count: 'text-xs',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          container: 'gap-3',
          reaction: 'p-3',
          emoji: 'text-xl',
          count: 'text-base',
          icon: 'w-6 h-6'
        };
      default: // md
        return {
          container: 'gap-1.5',
          reaction: 'p-1.5',
          emoji: 'text-sm',
          count: 'text-xs',
          icon: 'w-3.5 h-3.5'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const handleReactionClick = (reactionType: string) => {
    if (onReactionClick) {
      onReactionClick(reactionType);
    }
  };

  const handleMouseEnter = (reactionType: string) => {
    setHoveredReaction(reactionType);
    if (onReactionHover) {
      onReactionHover(reactionType);
    }
  };

  const handleMouseLeave = () => {
    setHoveredReaction(null);
    if (onReactionHover) {
      onReactionHover(null);
    }
  };

  return (
    <div className={`flex items-center ${sizeClasses.container}`}>
      {/* Individual reaction buttons */}
      {visibleReactions.map(([reactionType, count]) => {
        const config = reactionConfig[reactionType as keyof typeof reactionConfig];
        if (!config) return null;

        const isUserReaction = userReaction === reactionType;
        const isHovered = hoveredReaction === reactionType;

        return (
          <button
            key={reactionType}
            onClick={() => handleReactionClick(reactionType)}
            onMouseEnter={() => handleMouseEnter(reactionType)}
            onMouseLeave={handleMouseLeave}
            className={`flex items-center ${sizeClasses.reaction} rounded-full transition-all duration-200 ${
              isUserReaction
                ? `bg-blue-100 dark:bg-blue-900 ${config.color} scale-105`
                : darkMode
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${isHovered ? 'scale-110' : ''} ${onReactionClick ? 'cursor-pointer' : 'cursor-default'}`}
            title={`${count} ${config.label}${count !== 1 ? 's' : ''}`}
          >
            {/* Emoji */}
            <span className={sizeClasses.emoji}>{config.emoji}</span>
            
            {/* Count */}
            {showCounts && count && count > 0 && (
              <span className={`ml-1 ${sizeClasses.count} font-medium`}>
                {count}
              </span>
            )}
          </button>
        );
      })}

      {/* Show more indicator if there are hidden reactions */}
      {hiddenCount > 0 && (
        <div
          className={`flex items-center ${sizeClasses.reaction} rounded-full ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}
          title={`${hiddenCount} more reaction${hiddenCount !== 1 ? 's' : ''}`}
        >
          <Users className={sizeClasses.icon} />
          {showCounts && (
            <span className={`ml-1 ${sizeClasses.count} font-medium`}>
              +{hiddenCount}
            </span>
          )}
        </div>
      )}

      {/* Total count summary (optional) */}
      {size === 'lg' && totalReactions > 0 && (
        <div className={`ml-2 ${sizeClasses.count} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default ReactionDisplay;