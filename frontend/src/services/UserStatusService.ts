interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  isTyping: boolean;
}

class UserStatusService {
  private userStatuses = new Map<string, UserStatus>();
  private statusUpdateHandlers: ((userId: string, status: UserStatus) => void)[] = [];

  // Update user status
  updateUserStatus(userId: string, status: 'online' | 'offline' | 'away'): void {
    const currentStatus = this.userStatuses.get(userId) || {
      userId,
      status: 'offline',
      lastSeen: new Date(),
      isTyping: false
    };

    const updatedStatus: UserStatus = {
      ...currentStatus,
      status,
      lastSeen: new Date()
    };

    this.userStatuses.set(userId, updatedStatus);
    this.notifyStatusHandlers(userId, updatedStatus);
  }

  // Get user status
  getUserStatus(userId: string): UserStatus {
    return this.userStatuses.get(userId) || {
      userId,
      status: 'offline',
      lastSeen: new Date(),
      isTyping: false
    };
  }

  // Set typing status
  setTypingStatus(userId: string, isTyping: boolean): void {
    const currentStatus = this.getUserStatus(userId);
    const updatedStatus: UserStatus = {
      ...currentStatus,
      isTyping
    };

    this.userStatuses.set(userId, updatedStatus);
    this.notifyStatusHandlers(userId, updatedStatus);
  }

  // Subscribe to status updates
  onStatusUpdate(handler: (userId: string, status: UserStatus) => void): void {
    this.statusUpdateHandlers.push(handler);
  }

  // Unsubscribe from status updates
  offStatusUpdate(handler: (userId: string, status: UserStatus) => void): void {
    const index = this.statusUpdateHandlers.indexOf(handler);
    if (index > -1) {
      this.statusUpdateHandlers.splice(index, 1);
    }
  }

  // Check if user is online (last seen within 5 minutes)
  isUserOnline(userId: string): boolean {
    const status = this.getUserStatus(userId);
    if (status.status === 'online') return true;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return status.lastSeen > fiveMinutesAgo;
  }

  // Get status indicator color
  getStatusColor(userId: string): string {
    const status = this.getUserStatus(userId);
    
    if (this.isUserOnline(userId)) {
      return 'bg-green-500'; // Online
    } else if (status.status === 'away') {
      return 'bg-yellow-500'; // Away
    } else {
      return 'bg-gray-500'; // Offline
    }
  }

  // Get status text
  getStatusText(userId: string): string {
    const status = this.getUserStatus(userId);
    
    if (this.isUserOnline(userId)) {
      return 'Online';
    } else if (status.status === 'away') {
      return 'Away';
    } else {
      const timeDiff = Date.now() - status.lastSeen.getTime();
      const minutes = Math.floor(timeDiff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    }
  }

  private notifyStatusHandlers(userId: string, status: UserStatus): void {
    this.statusUpdateHandlers.forEach(handler => {
      try {
        handler(userId, status);
      } catch (error) {
        console.error('Error in status update handler:', error);
      }
    });
  }

  // Initialize with network status detection
  initialize(): void {
    // Update own status based on network connectivity
    const updateOwnStatus = () => {
      const currentUserId = this.getCurrentUserId();
      if (currentUserId) {
        this.updateUserStatus(currentUserId, navigator.onLine ? 'online' : 'offline');
      }
    };

    // Listen for network changes
    window.addEventListener('online', updateOwnStatus);
    window.addEventListener('offline', updateOwnStatus);

    // Set initial status
    updateOwnStatus();

    // Update status periodically
    setInterval(updateOwnStatus, 30000); // Every 30 seconds
  }

  private getCurrentUserId(): string | null {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.id || user.userId || user.user_id || null;
      }
    } catch (error) {
      console.error('Failed to get current user ID:', error);
    }
    return null;
  }
}

// Export singleton instance
export const userStatusService = new UserStatusService();
export default userStatusService;