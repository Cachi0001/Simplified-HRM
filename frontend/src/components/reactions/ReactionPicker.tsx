import React, { useState, useRef, useEffect } from 'react';
import { Smile, Heart, ThumbsUp, Laugh, Frown, Angry, CheckCircle } from 'lucide-react';

interface ReactionPickerProps {
  onReactionSelect: (reactionType: string) => void;
  onClose: () => void;
  darkMode?: boolean;
  currentReaction?: string;
  position?: 'top' | 'bottom';
}

const reactions = [
  { type: 'like', icon: ThumbsUp, emoji: '👍', label: 'Like' },
  { type: 'love', icon: Heart, emoji: '❤️', label: 'Love' },
  { type: 'laugh', icon: Laugh, emoji: '😂', label: 'Laugh' },
  { type: 'wow', icon: Smile, emoji: '😮', label: 'Wow' },
  { type: 'sad', icon: Frown, emoji: '😢', label: 'Sad' },
  { type: 'angry', icon: Angry, emoji: '😠', label: 'Angry' },
  { type: 'acknowledge', icon: CheckCircle, emoji: '✅', label: 'Acknowledge' }
];

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onReactionSelect,
  onClose,
  darkMode = false,
  currentReaction,
  position = 'top'
}) => {
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = useState<'left' | 'center' | 'right'>('center');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close picker on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position based on viewport boundaries
  useEffect(() => {
    if (pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      if (rect.left < 10) {
        setPickerPosition('left');
      } else if (rect.right > viewportWidth - 10) {
        setPickerPosition('right');
      } else {
        setPickerPosition('center');
      }
    }
  }, []);

  const handleReactionClick = (reactionType: string) => {
    onReactionSelect(reactionType);
    onClose();
  };

  const getPositionClasses = () => {
    const baseClasses = `absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`;
    
    switch (pickerPosition) {
      case 'left':
        return `${baseClasses} left-0 sm:left-0 right-auto`;
      case 'right':
        return `${baseClasses} right-0 sm:right-0 left-auto`;
      default:
        return `${baseClasses} left-1/2 transform -translate-x-1/2 max-w-[calc(100vw-2rem)]`;
    }
  };

  return (
    <div
      ref={pickerRef}
      className={getPositionClasses()}
    >
      {/* Tooltip for hovered reaction */}
      {hoveredReaction && (
        <div className={`absolute ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'
        }`}>
          {reactions.find(r => r.type === hoveredReaction)?.label}
          <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent ${
            position === 'top' 
              ? `border-t-4 ${darkMode ? 'border-t-gray-900' : 'border-t-gray-800'}` 
              : `border-b-4 ${darkMode ? 'border-b-gray-900' : 'border-b-gray-800'}`
          }`}></div>
        </div>
      )}

      {/* Reaction picker container */}
      <div className={`flex items-center gap-1 px-3 py-2 rounded-full shadow-lg border ${
        darkMode 
          ? 'bg-gray-800 border-gray-600' 
          : 'bg-white border-gray-200'
      }`}>
        {reactions.map((reaction) => {
          const Icon = reaction.icon;
          const isSelected = currentReaction === reaction.type;
          
          return (
            <button
              key={reaction.type}
              onClick={() => handleReactionClick(reaction.type)}
              onMouseEnter={() => setHoveredReaction(reaction.type)}
              onMouseLeave={() => setHoveredReaction(null)}
              className={`relative p-2 rounded-full transition-all duration-200 hover:scale-125 ${
                isSelected
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 scale-110'
                  : darkMode
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              title={reaction.label}
            >
              {/* Use emoji for better visual appeal */}
              <span className="text-lg leading-none">{reaction.emoji}</span>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Arrow pointing to the trigger */}
      <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent ${
        position === 'top' 
          ? `border-t-4 ${darkMode ? 'border-t-gray-800' : 'border-t-white'}` 
          : `border-b-4 ${darkMode ? 'border-b-gray-800' : 'border-b-white'}`
      }`}></div>
    </div>
  );
};

export default ReactionPicker;