import React, { useState } from 'react';
import { Smile, Plus } from 'lucide-react';
import ReactionPicker from './ReactionPicker';
import ReactionDisplay from './ReactionDisplay';

interface ReactionCounts {
  like?: number;
  love?: number;
  laugh?: number;
  wow?: number;
  sad?: number;
  angry?: number;
  acknowledge?: number;
}

interface ReactionButtonProps {
  reactions: ReactionCounts;
  userReaction?: string;
  onReactionSelect: (reactionType: string) => void;
  darkMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showAddButton?: boolean;
  disabled?: boolean;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({
  reactions = {},
  userReaction,
  onReactionSelect,
  darkMode = false,
  size = 'md',
  showAddButton = true,
  disabled = false
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  const handleReactionClick = (reactionType: string) => {
    if (disabled) return;
    onReactionSelect(reactionType);
  };

  const handleAddReactionClick = () => {
    if (disabled) return;
    setShowPicker(!showPicker);
  };

  const handleReactionSelect = (reactionType: string) => {
    onReactionSelect(reactionType);
    setShowPicker(false);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          addButton: 'p-1 text-xs',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          addButton: 'p-3 text-base',
          icon: 'w-6 h-6'
        };
      default: // md
        return {
          addButton: 'p-1.5 text-sm',
          icon: 'w-3.5 h-3.5'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Check if there are any reactions to display
  const hasReactions = reactions && Object.values(reactions).some(count => count && count > 0);

  return (
    <div className="relative flex items-center gap-2">
      {/* Display existing reactions */}
      {hasReactions && (
        <ReactionDisplay
          reactions={reactions}
          userReaction={userReaction}
          onReactionClick={handleReactionClick}
          onReactionHover={setHoveredReaction}
          darkMode={darkMode}
          size={size}
          showCounts={true}
        />
      )}

      {/* Add reaction button */}
      {showAddButton && (
        <div className="relative">
          <button
            onClick={handleAddReactionClick}
            disabled={disabled}
            className={`flex items-center ${sizeClasses.addButton} rounded-full transition-all duration-200 ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : darkMode
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${showPicker ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
            title="Add reaction"
          >
            {showPicker ? (
              <Plus className={`${sizeClasses.icon} transform rotate-45`} />
            ) : (
              <Smile className={sizeClasses.icon} />
            )}
          </button>

          {/* Reaction picker */}
          {showPicker && (
            <ReactionPicker
              onReactionSelect={handleReactionSelect}
              onClose={() => setShowPicker(false)}
              darkMode={darkMode}
              currentReaction={userReaction}
              position="top"
            />
          )}
        </div>
      )}

      {/* Reaction tooltip */}
      {hoveredReaction && (
        <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap z-40 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'
        }`}>
          {hoveredReaction.charAt(0).toUpperCase() + hoveredReaction.slice(1)} reaction
          <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent border-t-4 ${
            darkMode ? 'border-t-gray-900' : 'border-t-gray-800'
          }`}></div>
        </div>
      )}
    </div>
  );
};

export default ReactionButton;