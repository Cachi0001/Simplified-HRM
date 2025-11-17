import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Home, CheckSquare, Users, Settings, LogOut, MessageSquare, FileText, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useToast } from '../ui/Toast';

interface DraggableHamburgerMenuProps {
  darkMode?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface MenuDirection {
  horizontal: 'left' | 'right';
  vertical: 'up' | 'down';
}

const SNAP_DISTANCE = 80; // Distance to snap to edge
const MENU_WIDTH = 280;
const MENU_HEIGHT = 500; // Increased for new menu items
const NAVBAR_HEIGHT = 64; // BottomNavbar height
const HAMBURGER_SIZE = 44; // Size of hamburger button
const STORAGE_KEY = 'hamburgerMenuPosition';

export function DraggableHamburgerMenu({ darkMode = false }: DraggableHamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSnapped, setIsSnapped] = useState(false);
  const [menuDirection, setMenuDirection] = useState<MenuDirection>({ horizontal: 'left', vertical: 'down' });

  const menuRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Calculate optimal menu direction based on hamburger button position
  const calculateMenuDirection = (): MenuDirection => {
    if (!hamburgerRef.current) {
      return { horizontal: 'left', vertical: 'down' };
    }

    const rect = hamburgerRef.current.getBoundingClientRect();
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;

    // Determine horizontal direction
    const horizontal = rect.left > midX ? 'right' : 'left';
    
    // Determine vertical direction
    const vertical = rect.top > midY ? 'down' : 'up';

    return { horizontal, vertical };
  };

  // Calculate menu position based on direction
  const calculateMenuPosition = (): Position => {
    if (!hamburgerRef.current) {
      return { x: 0, y: 0 };
    }

    const rect = hamburgerRef.current.getBoundingClientRect();
    const { horizontal, vertical } = menuDirection;

    let x = 0;
    let y = 0;

    // Calculate X position
    if (horizontal === 'left') {
      x = rect.right + 10; // To the right of button
    } else {
      x = Math.max(10, rect.left - MENU_WIDTH - 10); // To the left of button
    }

    // Calculate Y position
    if (vertical === 'down') {
      y = rect.bottom + 10; // Below button
    } else {
      y = Math.max(10, rect.top - MENU_HEIGHT - 10); // Above button
    }

    // Clamp to viewport
    const { maxX, maxY } = getBounds();
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    return { x, y };
  };

  // Initialize user and load saved position
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error getting user:', err);
    }

    // Load saved position from localStorage
    const savedPosition = localStorage.getItem(STORAGE_KEY);
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (err) {
        console.error('Error loading saved position:', err);
      }
    }
  }, []);

  // Calculate boundary constraints
  const getBounds = () => {
    const maxX = Math.max(0, window.innerWidth - MENU_WIDTH - 10);
    const maxY = Math.max(0, window.innerHeight - MENU_HEIGHT - NAVBAR_HEIGHT - 10);
    return { maxX, maxY };
  };

  // Clamp position within bounds
  const clampPosition = (x: number, y: number): Position => {
    const { maxX, maxY } = getBounds();
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  };

  // Calculate snap position (snap to nearest edge)
  const calculateSnapPosition = (x: number, y: number): Position => {
    const { maxX, maxY } = getBounds();
    const snappedX =
      x < SNAP_DISTANCE ? 0 : x > maxX - SNAP_DISTANCE ? maxX : x;
    const snappedY =
      y < SNAP_DISTANCE ? 0 : y > maxY - SNAP_DISTANCE ? maxY : y;

    return { x: snappedX, y: snappedY };
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragHandleRef.current && !dragHandleRef.current.contains(e.target as Node)) {
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState({
      isDragging: true,
      startX: clientX - position.x,
      startY: clientY - position.y,
      currentX: position.x,
      currentY: position.y,
    });
  };

  // Handle drag move (desktop)
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const newX = e.clientX - dragState.startX;
    const newY = e.clientY - dragState.startY;
    const clamped = clampPosition(newX, newY);

    setDragState(prev => ({
      ...prev,
      currentX: clamped.x,
      currentY: clamped.y,
    }));
    setPosition(clamped);
  };

  // Handle touch move (mobile)
  const handleTouchMove = (e: TouchEvent) => {
    if (!dragState.isDragging) return;

    const newX = e.touches[0].clientX - dragState.startX;
    const newY = e.touches[0].clientY - dragState.startY;
    const clamped = clampPosition(newX, newY);

    setDragState(prev => ({
      ...prev,
      currentX: clamped.x,
      currentY: clamped.y,
    }));
    setPosition(clamped);
  };

  // Handle drag end with snap-to-edge
  const handleDragEnd = () => {
    if (!dragState.isDragging) return;

    const snappedPos = calculateSnapPosition(position.x, position.y);
    setPosition(snappedPos);
    setIsSnapped(true);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snappedPos));

    // Reset drag state
    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });

    // Remove snapped effect after animation
    setTimeout(() => setIsSnapped(false), 300);
  };

  // Add event listeners
  useEffect(() => {
    if (!dragState.isDragging) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragState, position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const clamped = clampPosition(position.x, position.y);
      setPosition(clamped);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Menu items
  const menuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      onClick: () => {
        const dashboardMap: Record<string, string> = {
          'superadmin': '/super-admin-dashboard',
          'admin': '/dashboard',
          'hr': '/hr-dashboard',
          'teamlead': '/teamlead-dashboard',
          'employee': '/employee-dashboard'
        };
        const targetDashboard = dashboardMap[currentUser?.role || 'employee'] || '/employee-dashboard';
        navigate(targetDashboard);
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
      icon: FileText,
      label: 'Leave Requests',
      onClick: () => {
        navigate('/leave-requests');
        setIsOpen(false);
      },
    },
    {
      icon: ShoppingCart,
      label: 'Purchase Requests',
      onClick: () => {
        navigate('/purchase-requests');
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
    localStorage.removeItem(STORAGE_KEY); // Clear saved position
    navigate('/auth');
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button - Fixed in corner */}
      <button
        ref={hamburgerRef}
        onClick={() => {
          if (!isOpen) {
            // Calculate direction when opening
            const direction = calculateMenuDirection();
            setMenuDirection(direction);
          }
          setIsOpen(!isOpen);
        }}
        className={`fixed z-40 p-3 rounded-full transition-all duration-200 ${
          darkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
            : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
        } ${isOpen ? 'opacity-80' : 'opacity-100 hover:opacity-90'} top-4 right-4`}
        title="Open menu (draggable)"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay (click to close) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={handleCloseMenu}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        />
      )}

      {/* Draggable Menu with Intelligent Directional Opening */}
      {isOpen && (
        <div
          ref={menuRef}
          className={`fixed z-40 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
            isSnapped ? 'scale-100' : 'scale-100'
          } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
          style={{
            transform: `translate(${calculateMenuPosition().x}px, ${calculateMenuPosition().y}px)`,
            width: MENU_WIDTH,
            maxHeight: '90vh',
            overflowY: 'auto',
            cursor: dragState.isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {/* Drag Handle Header */}
          <div
            ref={dragHandleRef}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`p-4 cursor-grab active:cursor-grabbing ${
              darkMode ? 'bg-gray-700 border-b border-gray-600' : 'bg-gray-50 border-b border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ☰ Menu
                </h3>
                <span className={`inline-block text-xs font-semibold mt-1 px-2 py-1 rounded ${
                  menuDirection.horizontal === 'left' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {menuDirection.vertical === 'down' ? '↓' : '↑'} {menuDirection.horizontal === 'left' ? 'Opens →' : 'Opens ←'}
                </span>
              </div>
              <button
                onClick={handleCloseMenu}
                className={`p-1 rounded hover:bg-gray-600 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Drag header to reposition
            </p>
          </div>

          {/* User Info */}
          {currentUser && (
            <div
              className={`px-4 py-2 ${
                darkMode ? 'bg-gray-700/50 border-b border-gray-600' : 'bg-gray-50 border-b border-gray-200'
              }`}
            >
              <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentUser.name}
              </p>
              <p
                className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {currentUser.role}
              </p>
            </div>
          )}

          {/* Menu Items */}
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

          {/* Divider */}
          <div className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border-t`} />

          {/* Logout Button */}
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

          {/* Footer Info */}
          <div className={`px-4 py-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {dragState.isDragging && <p className="text-blue-500">🎯 Dragging... Drop to snap</p>}
            <p>💡 Menu adapts to screen position</p>
          </div>
        </div>
      )}

      {/* Keyboard shortcut hint (optional) */}
      {import.meta.env.DEV && (
        <div className={`fixed bottom-20 right-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Press 'M' to toggle menu (DEV ONLY)
        </div>
      )}
    </>
  );
}