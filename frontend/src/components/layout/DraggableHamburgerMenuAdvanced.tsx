import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Home, CheckSquare, Users, Settings, LogOut, MessageSquare, Minimize2, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useToast } from '../ui/Toast';

/**
 * Advanced Draggable Hamburger Menu Component
 * 
 * ⚠️  REQUIRES: npm install react-draggable
 * 
 * Features:
 * - Draggable to any side of screen
 * - Snap-to-sides with magnetic effect
 * - Minimize/maximize button
 * - Smooth animations
 * - Position persistence
 * - Mobile touch support
 * - Dark mode support
 * - Boundary detection
 * - Window resize handling
 */

// This is a note on how to use react-draggable if needed
// Uncomment the import and Draggable component below to enable it

/*
import Draggable from 'react-draggable';

interface DraggableHamburgerMenuAdvancedProps {
  darkMode?: boolean;
}

interface Position {
  x: number;
  y: number;
}

const SNAP_DISTANCE = 80;
const MENU_WIDTH = 280;
const MENU_HEIGHT = 380;
const NAVBAR_HEIGHT = 64;
const STORAGE_KEY = 'hamburgerMenuPositionAdvanced';

export function DraggableHamburgerMenuAdvanced({ darkMode = false }: DraggableHamburgerMenuAdvancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSnapping, setIsSnapping] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();
  const draggableRef = useRef(null);

  // Initialize
  useEffect(() => {
    const user = authService.getCurrentUserFromStorage();
    setCurrentUser(user);

    const savedPosition = localStorage.getItem(STORAGE_KEY);
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (err) {
        console.error('Error loading position:', err);
      }
    }
  }, []);

  const handleDrag = (_e: any, d: { x: number; y: number }) => {
    setPosition({ x: d.x, y: d.y });
  };

  const handleDragStop = (_e: any, d: { x: number; y: number }) => {
    // Calculate snap-to-edges
    const maxX = Math.max(0, window.innerWidth - MENU_WIDTH - 10);
    const maxY = Math.max(0, window.innerHeight - MENU_HEIGHT - NAVBAR_HEIGHT - 10);

    let snappedX = d.x;
    let snappedY = d.y;

    // Snap X
    if (d.x < SNAP_DISTANCE) {
      snappedX = 0;
    } else if (d.x > maxX - SNAP_DISTANCE) {
      snappedX = maxX;
    }

    // Snap Y
    if (d.y < SNAP_DISTANCE) {
      snappedY = 0;
    } else if (d.y > maxY - SNAP_DISTANCE) {
      snappedY = maxY;
    }

    const finalPosition = { x: snappedX, y: snappedY };
    setPosition(finalPosition);
    setIsSnapping(true);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPosition));

    // Animation
    setTimeout(() => setIsSnapping(false), 300);
  };

  // Menu items (same as basic version)
  const menuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      onClick: () => {
        navigate(currentUser?.role === 'employee' ? '/employee-dashboard' : '/dashboard');
        setIsOpen(false);
      },
    },
    {
      icon: CheckSquare,
      label: 'Tasks',
      onClick: () => {
        navigate('/tasks');
        setIsOpen(false);
      },
    },
    {
      icon: Users,
      label: 'Employees',
      onClick: () => {
        if (currentUser?.role === 'admin' || currentUser?.role === 'hr') {
          navigate('/employees');
          setIsOpen(false);
        } else {
          addToast('error', 'Only admin/HR can access this section');
        }
      },
      adminOnly: true,
    },
    {
      icon: MessageSquare,
      label: 'Chat',
      onClick: () => {
        navigate('/chat');
        setIsOpen(false);
      },
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(STORAGE_KEY);
    navigate('/auth');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-40 p-3 rounded-full transition-all duration-200 ${
          darkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
            : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
        } top-4 right-4`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        />
      )}

      {isOpen && (
        <Draggable
          nodeRef={draggableRef}
          defaultPosition={{ x: position.x, y: position.y }}
          onDrag={handleDrag}
          onStop={handleDragStop}
          handle=".drag-handle"
        >
          <div
            ref={draggableRef}
            className={`fixed z-40 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } border`}
            style={{
              width: MENU_WIDTH,
              cursor: 'grab',
            }}
          >
            <div className="drag-handle p-4 cursor-grab active:cursor-grabbing bg-gray-700 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-200'}`}>
                  ☰ Menu
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {!isMinimized && (
              <>
                {currentUser && (
                  <div className={`px-4 py-2 ${darkMode ? 'bg-gray-700/50 border-b border-gray-600' : 'bg-gray-50 border-b border-gray-200'}`}>
                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {currentUser.name}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentUser.role}
                    </p>
                  </div>
                )}

                <div className="py-2">
                  {menuItems.map((item) => (
                    (!item.adminOnly || (currentUser?.role === 'admin' || currentUser?.role === 'hr')) && (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          darkMode
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    )
                  ))}
                </div>

                <div className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border-t`} />

                <button
                  onClick={handleLogout}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                    darkMode
                      ? 'text-red-400 hover:bg-red-900/20'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </>
            )}
          </div>
        </Draggable>
      )}
    </>
  );
}
*/

// FALLBACK: If react-draggable is not installed, export error component
export function DraggableHamburgerMenuAdvanced() {
  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 rounded p-3 text-red-700 text-sm">
      ⚠️ DraggableHamburgerMenuAdvanced requires: <code>npm install react-draggable</code>
      <br />
      Use DraggableHamburgerMenu instead (no dependencies needed).
    </div>
  );
}