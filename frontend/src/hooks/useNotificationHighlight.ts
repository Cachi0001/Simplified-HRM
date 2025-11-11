import { useEffect, useCallback } from 'react';

interface HighlightOptions {
  scrollBehavior?: ScrollBehavior;
  scrollBlock?: ScrollLogicalPosition;
  highlightDuration?: number;
  animationClass?: string;
}

/**
 * Custom hook to handle notification-triggered highlights
 * Automatically scrolls to and highlights elements when navigating from notifications
 */
export const useNotificationHighlight = (
  items: any[],
  options: HighlightOptions = {}
) => {
  const {
    scrollBehavior = 'smooth',
    scrollBlock = 'center',
    highlightDuration = 3000,
    animationClass = 'notification-highlight'
  } = options;

  const highlightElement = useCallback((elementId: string) => {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById(elementId);
      
      if (element) {
        // Scroll to element
        element.scrollIntoView({ 
          behavior: scrollBehavior, 
          block: scrollBlock 
        });
        
        // Add highlight animation classes
        element.classList.add(
          animationClass,
          'ring-4',
          'ring-blue-500',
          'ring-opacity-50',
          'transition-all',
          'duration-300',
          'animate-pulse-slow'
        );
        
        // Remove classes after duration
        setTimeout(() => {
          element.classList.remove(
            animationClass,
            'ring-4',
            'ring-blue-500',
            'ring-opacity-50',
            'animate-pulse-slow'
          );
          
          // Clear session storage
          sessionStorage.removeItem('highlight_id');
          sessionStorage.removeItem('highlight_type');
        }, highlightDuration);
      } else {
        console.warn(`Element with ID ${elementId} not found for highlighting`);
      }
    }, 500);
  }, [scrollBehavior, scrollBlock, highlightDuration, animationClass]);

  useEffect(() => {
    // Check if there's a highlight request from notification
    const highlightId = sessionStorage.getItem('highlight_id');
    const highlightType = sessionStorage.getItem('highlight_type');
    
    if (highlightId && items.length > 0) {
      console.log('🎯 Highlighting element:', highlightId, 'Type:', highlightType);
      
      // Construct element ID based on type
      let elementId = highlightId;
      
      // Add type prefix if needed
      if (highlightType === 'approval') {
        // Check if it's a leave or purchase request
        const isLeave = items.some((item: any) => 
          item.id === highlightId && (item.type || item.leave_type)
        );
        const isPurchase = items.some((item: any) => 
          item.id === highlightId && item.item_name
        );
        
        if (isLeave) {
          elementId = `leave-card-${highlightId}`;
        } else if (isPurchase) {
          elementId = `purchase-card-${highlightId}`;
        }
      } else if (highlightType === 'task') {
        elementId = `task-card-${highlightId}`;
      } else if (highlightType === 'employee') {
        elementId = `employee-card-${highlightId}`;
      }
      
      highlightElement(elementId);
    }
  }, [items, highlightElement]);

  return { highlightElement };
};

/**
 * Helper function to generate consistent card IDs
 */
export const getCardId = (type: string, id: string): string => {
  const typeMap: Record<string, string> = {
    'leave': 'leave-card',
    'purchase': 'purchase-card',
    'task': 'task-card',
    'employee': 'employee-card',
    'announcement': 'announcement-card',
    'attendance': 'attendance-card'
  };
  
  const prefix = typeMap[type] || `${type}-card`;
  return `${prefix}-${id}`;
};
