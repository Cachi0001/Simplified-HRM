import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Users,
  Search,
  Plus,
  ArrowLeft,
  Bell,
  History,
  Moon,
  Sun,
} from "lucide-react";
import { ChatBadge } from "./ChatBadge";
import { useOptimizedChat, Chat, User } from "../../hooks/useOptimizedChat";
import { useTheme } from "../../contexts/ThemeContext";
import api from "../../lib/api";
import supabaseRealtimeService from "../../services/SupabaseRealtimeService";
import { IndicatorWrapper } from "../indicators/IndicatorWrapper";
import { IndicatorTest } from "../indicators/IndicatorTest";
import WhatsAppMessageList from "./WhatsAppMessageList";
import { useMessageIndicators } from "../../hooks/useMessageIndicators";
import { AnnouncementList, CreateAnnouncement } from "../announcements";
import { useAnnouncements } from "../../hooks/useAnnouncements";
import Logo from "../ui/Logo";

interface FloatingChatWidgetProps {
  className?: string;
}

type TabType = "dms" | "announcements" | "history";

interface ExtendedChat extends Chat {
  userData?: User;
  loading?: boolean;
  isUser?: boolean;
}

export function FloatingChatWidget({
  className = "",
}: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("dms");
  const [selectedChat, setSelectedChat] = useState<ExtendedChat | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Use global theme instead of local state
  const { darkMode, toggleDarkMode } = useTheme();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use optimized chat hook with Supabase realtime
  const {
    chats,
    users,
    messages,
    isLoading,
    error: chatError,
    connectionStatus,
    loadMessages,
    loadUsers,
    sendMessage: sendChatMessage,
    retryMessage,
    createOrGetDM,
    markChatAsRead,
    getTotalUnreadCount,
    subscribeToChat,
    unsubscribeFromChat,
    startTyping,
    stopTyping,
    typingUsers: chatTypingUsers,
    clearCache,
    forceRefresh,
  } = useOptimizedChat({
    enableRealtime: true,
    maxRetries: 3,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes cache
  });

  // Initialize message indicators
  const { handleMessageSent, handleMessageReceived, hasActiveIndicator } =
    useMessageIndicators();

  // Use announcements hook
  const {
    announcements,
    loading: announcementsLoading,
    error: announcementsError,
    canCreate: canCreateAnnouncements,
    createAnnouncement,
    handleReaction,
    markAsRead,
    updateFilters,
    refresh: refreshAnnouncements,
  } = useAnnouncements();

  // State for typing indicator - only show when actually typing
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Use typing users from useChat hook and convert IDs to names
  const currentChatTypingUserIds = selectedChat
    ? chatTypingUsers[selectedChat.id] || []
    : [];
  const currentChatTypingUsers = currentChatTypingUserIds.map((userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : `User ${userId}`;
  });

  // Initialize Supabase realtime service
  useEffect(() => {
    console.log("🚀 Initializing Supabase realtime for chat widget");

    // Update user status to online
    supabaseRealtimeService.updateUserStatus("online");

    // Set up global event listeners for performance
    const handleVisibilityChange = () => {
      if (document.hidden) {
        supabaseRealtimeService.updateUserStatus("away");
      } else {
        supabaseRealtimeService.updateUserStatus("online");
      }
    };

    const handleBeforeUnload = () => {
      supabaseRealtimeService.updateUserStatus("offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      supabaseRealtimeService.updateUserStatus("offline");
    };
  }, []);

  // Set up WebSocket listeners for message indicators
  useEffect(() => {
    const handleMessageIndicator = (event: CustomEvent) => {
      const { userId, chatId, indicatorType } = event.detail;
      console.log("✨ Message indicator event received:", {
        userId,
        chatId,
        indicatorType,
      });

      if (indicatorType === "sent") {
        handleMessageSent(userId, chatId);
      } else if (indicatorType === "received") {
        handleMessageReceived(userId, chatId);
      }
    };

    const handleUserIndicator = (event: CustomEvent) => {
      const { userId, chatId, indicatorType } = event.detail;
      console.log("👤 User indicator event received:", {
        userId,
        chatId,
        indicatorType,
      });

      // Handle global user indicators (for avatar indicators)
      if (indicatorType === "sent") {
        handleMessageSent(userId, chatId);
      } else if (indicatorType === "received") {
        handleMessageReceived(userId, chatId);
      }
    };

    // Listen for WebSocket indicator events
    window.addEventListener(
      "message-indicator",
      handleMessageIndicator as EventListener,
    );
    window.addEventListener(
      "user-indicator",
      handleUserIndicator as EventListener,
    );

    return () => {
      window.removeEventListener(
        "message-indicator",
        handleMessageIndicator as EventListener,
      );
      window.removeEventListener(
        "user-indicator",
        handleUserIndicator as EventListener,
      );
    };
  }, [handleMessageSent, handleMessageReceived]);

  // Remove conflicting real-time message state - messages are handled by useChat hook

  // Dark mode is now managed globally - no need for local storage

  // Optimized message loading with debouncing
  const loadMessagesDebounced = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedChat?.id) {
      console.log("🔍 Loading messages for selected chat:", {
        chatId: selectedChat.id,
        chatName: selectedChat.name,
        messageCount: messages[selectedChat.id]?.length || 0,
      });

      // Clear existing debounce
      if (loadMessagesDebounced.current) {
        clearTimeout(loadMessagesDebounced.current);
      }

      // Debounced loading to prevent rapid calls
      loadMessagesDebounced.current = setTimeout(() => {
        loadMessages(selectedChat.id);
        // Only mark as read if actively viewing (not history)
        if (activeTab === "dms") {
          markChatAsRead(selectedChat.id);
        }
      }, 150);

      return () => {
        if (loadMessagesDebounced.current) {
          clearTimeout(loadMessagesDebounced.current);
        }
      };
    }
  }, [selectedChat?.id, loadMessages, markChatAsRead, activeTab]);

  // Get messages for the selected chat
  const chatMessages = selectedChat?.id ? messages[selectedChat.id] || [] : [];

  // Optimized message display logging (reduced frequency)
  const logMessageUpdates = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedChat?.id && chatMessages.length > 0) {
      // Throttle logging to prevent console spam
      if (logMessageUpdates.current) {
        clearTimeout(logMessageUpdates.current);
      }

      logMessageUpdates.current = setTimeout(() => {
        console.log("📊 Message display update:", {
          chatId: selectedChat.id,
          messageCount: chatMessages.length,
          lastMessage:
            chatMessages[chatMessages.length - 1]?.content?.substring(0, 30) +
            "...",
        });
      }, 1000);
    }

    return () => {
      if (logMessageUpdates.current) {
        clearTimeout(logMessageUpdates.current);
      }
    };
  }, [selectedChat?.id, chatMessages.length]);

  // Optimized auto-scroll with throttling
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (messagesEndRef.current && selectedChat && chatMessages.length > 0) {
      // Clear existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Throttled scroll to prevent excessive calls
      scrollTimeoutRef.current = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }
      }, 100);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [chatMessages.length, selectedChat?.id]);

  // Clear typing indicators when switching chats
  useEffect(() => {
    setIsTyping(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  }, [selectedChat?.id]);

  // Handle typing indicator
  const handleTypingChange = useCallback(
    (value: string) => {
      if (!selectedChat) return;

      if (value.trim() && !isTyping) {
        // Start typing
        setIsTyping(true);
        startTyping(selectedChat.id);
      }

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to stop typing after 2 seconds of inactivity
      const newTimeout = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          stopTyping(selectedChat.id);
        }
      }, 2000);

      setTypingTimeout(newTimeout);
    },
    [selectedChat, isTyping, typingTimeout, startTyping, stopTyping],
  );

  // Optimized realtime subscription with cleanup
  const subscriptionRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!selectedChat?.id) {
      return;
    }

    console.log(
      "🔄 Setting up optimized realtime subscription for chat:",
      selectedChat.id,
    );

    // Clean up existing subscription
    if (subscriptionRef.current) {
      unsubscribeFromChat(selectedChat.id);
      subscriptionRef.current = null;
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Setup subscription with error handling
    const setupSubscription = () => {
      try {
        subscriptionRef.current = subscribeToChat(selectedChat.id);
        console.log(
          "✅ Realtime subscription established for chat:",
          selectedChat.id,
        );
      } catch (error) {
        console.error("❌ Failed to setup subscription:", error);

        // Retry with exponential backoff
        retryTimeoutRef.current = setTimeout(() => {
          if (selectedChat?.id) {
            console.log("🔄 Retrying subscription for chat:", selectedChat.id);
            setupSubscription();
          }
        }, 3000);
      }
    };

    setupSubscription();

    return () => {
      console.log("🧹 Cleaning up subscription for chat:", selectedChat.id);

      if (subscriptionRef.current) {
        unsubscribeFromChat(selectedChat.id);
        subscriptionRef.current = null;
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [selectedChat?.id, subscribeToChat, unsubscribeFromChat]);

  const totalUnreadCount = getTotalUnreadCount();

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "hr":
        return "bg-blue-500 text-white";
      case "super-admin":
        return "bg-purple-500 text-white";
      case "admin":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // WhatsApp-style time formatting for chat list
  const formatWhatsAppTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays === 1) return "yesterday";
      if (diffDays < 7)
        return date.toLocaleDateString([], { weekday: "short" });
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch (error) {
      return "";
    }
  };

  // Helper function to get current user ID
  const getCurrentUserId = () => {
    try {
      // Try multiple possible keys for user data
      const possibleKeys = ["user", "currentUser", "authUser", "userData"];

      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (parsed && (parsed.id || parsed.userId || parsed.user_id)) {
              return parsed.id || parsed.userId || parsed.user_id;
            }
          } catch (parseError) {
            continue;
          }
        }
      }

      // Try to extract from JWT token
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join(""),
          );

          const decoded = JSON.parse(jsonPayload);
          if (
            decoded &&
            (decoded.id || decoded.userId || decoded.user_id || decoded.sub)
          ) {
            return (
              decoded.id || decoded.userId || decoded.user_id || decoded.sub
            );
          }
        } catch (tokenError) {
          // Silent fail
        }
      }
    } catch (error) {
      console.error("Failed to get current user ID:", error);
    }
    return null;
  };

  // For DMs, show available users to chat with in WhatsApp style (moved from announcements)
  const getDisplayItems = (): ExtendedChat[] => {
    if (activeTab === "dms") {
      const currentUserId = getCurrentUserId();

      // Get existing chats
      const filteredChats = chats.filter((chat) => {
        if (
          searchQuery &&
          !chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      });

      // Transform existing chats
      const existingChats = filteredChats.map((chat) => {
        const chatMessages = messages[chat.id] || [];
        const latestMessage =
          chatMessages.length > 0
            ? chatMessages[chatMessages.length - 1]
            : null;

        return {
          ...chat,
          lastMessage:
            latestMessage?.content || chat.lastMessage || "No messages yet",
          lastMessageTime: latestMessage?.timestamp
            ? formatWhatsAppTime(latestMessage.timestamp)
            : chat.lastMessageTime || "",
          sortTimestamp:
            latestMessage?.timestamp ||
            chat.createdAt ||
            "1970-01-01T00:00:00Z",
          hasUnread: chat.unreadCount > 0,
          isUser: false,
          userData: undefined,
        };
      });

      // Transform users for chat list (exclude current user)
      const transformedUsers = (users || [])
        .filter((user) => {
          // Exclude current user from DM list
          return user.id !== currentUserId && user.employeeId !== currentUserId;
        })
        .filter((user) => {
          // Apply search filter
          if (
            searchQuery &&
            !user.name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
            return false;
          return true;
        })
        .filter((user) => {
          // Exclude users who already have existing chats
          return !existingChats.some(
            (chat) =>
              chat.userData?.id === user.id ||
              chat.userData?.employeeId === user.employeeId ||
              chat.name === user.name,
          );
        })
        .map((user) => ({
          id: `user-${user.id}`,
          name: user.name,
          type: "dm" as const,
          lastMessage: "Start a conversation",
          lastMessageTime: "",
          unreadCount: 0,
          userData: user,
          isUser: true,
          sortTimestamp: "1970-01-01T00:00:00Z",
          hasUnread: false,
        }));

      // Combine and sort: existing chats first (by activity), then available users (alphabetically)
      const combinedItems = [
        ...existingChats.sort((a, b) => {
          // First sort by unread status (unread chats first)
          if (a.hasUnread && !b.hasUnread) return -1;
          if (!a.hasUnread && b.hasUnread) return 1;

          // Then sort by latest message timestamp (newest first)
          return (
            new Date(b.sortTimestamp).getTime() -
            new Date(a.sortTimestamp).getTime()
          );
        }),
        ...transformedUsers.sort((a, b) => a.name.localeCompare(b.name)),
      ];

      return combinedItems;
    } else if (activeTab === "history") {
      // For history tab, show conversation history as chat items
      return conversationHistory
        .filter((conversation) => {
          if (
            searchQuery &&
            !conversation.participantNames?.some((name: string) =>
              name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
          )
            return false;
          return true;
        })
        .map((conversation) => ({
          id: conversation.id,
          name:
            conversation.participantNames?.join(", ") || "Unknown participants",
          type: "dm" as const,
          lastMessage: conversation.lastMessage || "No messages yet",
          lastMessageTime: conversation.lastMessageAt
            ? new Date(conversation.lastMessageAt).toLocaleDateString()
            : "No date",
          unreadCount: 0,
          userData: {
            id: conversation.id,
            name:
              conversation.participantNames?.join(", ") ||
              "Unknown participants",
            email: "conversation@system.local",
            role: "conversation",
            status: "offline" as const,
          },
          isUser: false,
        }));
    } else {
      // For announcements tab, return empty array since we don't show a list
      return [];
    }
  };

  const displayItems = getDisplayItems();

  // Handle chat errors silently
  useEffect(() => {
    // Errors are handled by the useChat hook
  }, [chatError]);

  const handleChatSelect = async (item: ExtendedChat) => {
    try {
      // Show loading state immediately
      setSelectedChat({
        ...item,
        loading: true,
      });

      if (item.isUser) {
        // Create or get DM with this user
        const dmChat = await createOrGetDM(item.userData.id);
        if (dmChat) {
          console.log("🔍 DM Chat created/retrieved:", {
            dmChatId: dmChat.id,
            recipientId: item.userData.id,
            recipientName: item.userData.name,
          });

          setSelectedChat({
            ...dmChat,
            userData: item.userData,
            loading: false,
          });

          // Load messages with the correct DM chat ID
          console.log("📜 Loading messages for DM chat:", dmChat.id);
          loadMessages(dmChat.id);
        }
      } else {
        // Regular chat selection
        setSelectedChat({
          ...item,
          loading: false,
        });
        // Load messages in background
        loadMessages(item.id);
      }
    } catch (error) {
      console.error("Failed to select chat:", error);
      setSelectedChat(null);
    }
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedChat || isSending) return;

    try {
      setIsSending(true);
      setMessageInput("");

      // Stop typing indicator when sending message
      if (isTyping) {
        setIsTyping(false);
        stopTyping(selectedChat.id);
        if (typingTimeout) {
          clearTimeout(typingTimeout);
          setTypingTimeout(null);
        }
      }

      console.log("📤 Sending message to chat:", {
        chatId: selectedChat.id,
        content: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        chatName: selectedChat.name,
      });

      await sendChatMessage(selectedChat.id, content);

      // Trigger message indicator for current user (only for actual sent messages)
      const currentUserId = getCurrentUserId();
      if (currentUserId) {
        handleMessageSent(currentUserId, selectedChat.id);
        console.log("✨ Message indicator triggered for user:", currentUserId);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message input on error
      setMessageInput(content);
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to get current user's role
  const getCurrentUserRole = () => {
    try {
      // Try multiple possible keys for user data
      const possibleKeys = ["user", "currentUser", "authUser", "userData"];

      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (parsed && parsed.role) {
              return parsed.role;
            }
          } catch (parseError) {
            continue;
          }
        }
      }

      // Try to extract from JWT token
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join(""),
          );

          const decoded = JSON.parse(jsonPayload);
          if (decoded && decoded.role) {
            return decoded.role;
          }
        } catch (tokenError) {
          // Silent fail
        }
      }
    } catch (error) {
      console.error("Failed to get current user role:", error);
    }
    return "employee"; // Default to employee role
  };

  // Helper function to check if user can edit/delete announcements
  const canManageAnnouncement = (announcement: any) => {
    const userRole = getCurrentUserRole();
    const currentUserId = getCurrentUserId();

    // Superadmin and admin can manage all announcements
    if (["superadmin", "admin"].includes(userRole)) {
      return true;
    }

    // HR can manage their own announcements
    if (userRole === "hr" && announcement.author_id === currentUserId) {
      return true;
    }

    return false;
  };

  // Helper function to check if user can access conversation history
  const canAccessHistory = () => {
    const userRole = getCurrentUserRole();
    return ["hr", "admin", "superadmin"].includes(userRole);
  };

  // Fetch conversation history for administrators
  const fetchConversationHistory = async () => {
    if (!canAccessHistory()) return;

    try {
      setHistoryLoading(true);
      const response = await api.get("/chat/conversation-history");
      setConversationHistory(response.data.data?.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversation history:", error);
      setConversationHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load conversation history when History tab is selected
  useEffect(() => {
    if (activeTab === "history" && canAccessHistory()) {
      fetchConversationHistory();
    }
  }, [activeTab]);

  // Authentication guard
  const isAuthenticated = !!localStorage.getItem("accessToken");
  const isLanding =
    typeof window !== "undefined" && window.location.pathname === "/";
  if (!isAuthenticated || isLanding) {
    return null;
  }

  const themeClasses = darkMode
    ? "bg-gray-900 text-white border-gray-700 transition-colors duration-300"
    : "bg-white text-gray-900 border-gray-200 transition-colors duration-300";

  // Chat button when closed
  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <div className="relative">
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            }}
            title="Open Chat"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <ChatBadge count={totalUnreadCount} />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Container - Fixed positioning that works at all zoom levels */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          className={`${themeClasses} rounded-xl shadow-2xl border transition-all duration-300 w-full h-full sm:w-[85vw] sm:h-[85vh] sm:max-w-5xl sm:max-h-[700px] sm:min-h-[500px] overflow-hidden flex flex-col`}
          style={{
            maxHeight: "calc(100vh - 2rem)", // Ensure modal never exceeds viewport minus padding
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5" />
              <Logo className="h-7 w9" />
              <h3 className="font-semibold text-lg">Chat</h3>
              {totalUnreadCount > 0 && (
                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded hover:bg-white/20 transition-all duration-200"
                title={
                  darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded hover:bg-white/20 transition-colors"
                title="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - DMs List or Announcements */}
            <div
              className={`${selectedChat ? "hidden md:flex" : "flex"} w-full md:w-80 flex-col border-r ${darkMode ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}
            >
              {/* Tab Navigation */}
              <div
                className={`flex border-b ${darkMode ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}
              >
                {[
                  { key: "dms", label: "DMs", icon: MessageCircle },
                  { key: "announcements", label: "News", icon: Bell },
                  ...(canAccessHistory()
                    ? [{ key: "history", label: "History", icon: History }]
                    : []),
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveTab(key as TabType);
                      setSelectedChat(null); // Clear selected chat when switching tabs
                    }}
                    className={`flex-1 p-3 text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                      activeTab === key
                        ? darkMode
                          ? "bg-gray-800 text-blue-400"
                          : "bg-blue-50 text-blue-600"
                        : darkMode
                          ? "text-gray-400 hover:text-white"
                          : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Announcements View in Sidebar */}
              {activeTab === "announcements" ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <AnnouncementList
                    announcements={announcements}
                    loading={announcementsLoading}
                    error={announcementsError}
                    onReaction={handleReaction}
                    onMarkAsRead={markAsRead}
                    onFiltersChange={updateFilters}
                    onRefresh={refreshAnnouncements}
                    onCreateNew={() => setShowCreateAnnouncement(true)}
                    canCreate={canCreateAnnouncements}
                    darkMode={darkMode}
                  />
                </div>
              ) : (
                <>
                  {/* Search Bar - Only for DMs and History */}
                  <div className="p-4 flex-shrink-0">
                    <div className="relative mb-2">
                      <Search
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      />
                      <input
                        type="text"
                        placeholder={
                          activeTab === "dms"
                            ? "Search chats..."
                            : "Search conversations..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode
                            ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                        }`}
                      />
                    </div>

                    {/* Refresh Button */}
                    <button
                      onClick={() => {
                        if (activeTab === "dms") {
                          loadUsers();
                        } else if (activeTab === "history") {
                          fetchConversationHistory();
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      {activeTab === "dms"
                        ? "Refresh Chats"
                        : "Refresh History"}
                    </button>
                  </div>

                  {/* User/Chat List */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div
                        className={`p-6 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">Loading users...</p>
                      </div>
                    ) : displayItems.length === 0 ? (
                      <div
                        className={`p-6 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {activeTab === "dms"
                            ? "No users available"
                            : activeTab === "history"
                              ? "No conversation history found"
                              : "No chats found"}
                        </p>
                        {chatError && (
                          <p className="text-xs mt-2 text-red-500">
                            Error please click the refresh button
                          </p>
                        )}
                      </div>
                    ) : (
                      displayItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleChatSelect(item)}
                          className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            selectedChat?.id === item.id
                              ? darkMode
                                ? "bg-gray-800"
                                : "bg-blue-50"
                              : darkMode
                                ? "border-gray-700"
                                : "border-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Circular Avatar (40px) with status indicator */}
                            <div className="relative w-10 h-10 flex-shrink-0">
                              {activeTab === "dms" ? (
                                <IndicatorWrapper userId={item.id}>
                                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                                    {item.name
                                      ? item.name.charAt(0).toUpperCase()
                                      : "U"}
                                  </div>
                                </IndicatorWrapper>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                                  {item.name
                                    ? item.name.charAt(0).toUpperCase()
                                    : "U"}
                                </div>
                              )}
                              {/* Status indicator */}
                              {item.isUser && (
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${userStatusService.getStatusColor(item.userData?.id || "")}`}
                                ></div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-sm truncate">
                                  {item.name}
                                </h4>
                                <span
                                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                                >
                                  {item.lastMessageTime}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {/* Show message preview with sender info */}
                                  <div className="flex-1 min-w-0">
                                    {!item.isUser &&
                                    item.lastMessage &&
                                    item.lastMessage !== "No messages yet" ? (
                                      <div className="flex items-center gap-1">
                                        {/* Show "You:" for own messages */}
                                        {(() => {
                                          const chatMessages =
                                            messages[item.id] || [];
                                          const latestMessage =
                                            chatMessages[
                                              chatMessages.length - 1
                                            ];
                                          const currentUserId =
                                            getCurrentUserId();
                                          const isOwnMessage =
                                            latestMessage &&
                                            String(latestMessage.senderId) ===
                                              String(currentUserId);

                                          return isOwnMessage ? (
                                            <span
                                              className={`text-xs font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                                            >
                                              You:
                                            </span>
                                          ) : null;
                                        })()}
                                        <p
                                          className={`text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                                        >
                                          {item.lastMessage}
                                        </p>
                                      </div>
                                    ) : (
                                      <p
                                        className={`text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                                      >
                                        {item.lastMessage}
                                      </p>
                                    )}
                                  </div>

                                  {/* Role Badge for non-employees */}
                                  {item.userData?.role &&
                                    item.userData.role !== "employee" && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(item.userData.role)}`}
                                      >
                                        {item.userData.role}
                                      </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 ml-2">
                                  {/* Message status for own messages */}
                                  {(() => {
                                    const chatMessages =
                                      messages[item.id] || [];
                                    const latestMessage =
                                      chatMessages[chatMessages.length - 1];
                                    const currentUserId = getCurrentUserId();
                                    const isOwnMessage =
                                      latestMessage &&
                                      String(latestMessage.senderId) ===
                                        String(currentUserId);

                                    if (isOwnMessage && latestMessage?.status) {
                                      return (
                                        <span
                                          className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                                        >
                                          {latestMessage.status === "sending" &&
                                            "⏳"}
                                          {latestMessage.status === "sent" &&
                                            "✓"}
                                          {latestMessage.status ===
                                            "delivered" && "✓✓"}
                                          {latestMessage.status === "read" &&
                                            "✓✓"}
                                          {latestMessage.status === "failed" &&
                                            "❌"}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* Unread count badge */}
                                  {item.unreadCount > 0 && (
                                    <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                      {item.unreadCount > 99
                                        ? "99+"
                                        : item.unreadCount}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Main Content Area */}
            {activeTab === "history" && !selectedChat ? (
              /* Conversation History View */
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Conversation History
                  </h2>
                  <button
                    onClick={fetchConversationHistory}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      darkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Refresh
                  </button>
                </div>

                {historyLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div
                        className={`animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2`}
                      ></div>
                      <p
                        className={darkMode ? "text-gray-300" : "text-gray-600"}
                      >
                        Loading conversation history...
                      </p>
                    </div>
                  </div>
                ) : conversationHistory.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <History
                        className={`w-12 h-12 mx-auto mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      />
                      <p
                        className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                      >
                        No conversation history
                      </p>
                      <p
                        className={darkMode ? "text-gray-400" : "text-gray-600"}
                      >
                        Conversation history will appear here when users start
                        chatting
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {conversationHistory.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          darkMode
                            ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          // Handle conversation selection - could open the conversation
                          console.log("Selected conversation:", conversation);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3
                                className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                              >
                                {conversation.participantNames?.join(", ") ||
                                  "Unknown participants"}
                              </h3>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  darkMode
                                    ? "bg-gray-700 text-gray-300"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {conversation.messageCount || 0} messages
                              </span>
                            </div>
                            <p
                              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} line-clamp-2`}
                            >
                              {conversation.lastMessage || "No messages yet"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}
                            >
                              {conversation.lastMessageAt
                                ? new Date(
                                    conversation.lastMessageAt,
                                  ).toLocaleDateString()
                                : "No date"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedChat ? (
              /* Chat Messages Area */
              <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div
                  className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors md:hidden`}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Avatar */}
                    <IndicatorWrapper
                      userId={selectedChat.userData?.id || selectedChat.id}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                        {(
                          selectedChat.userData?.name ||
                          selectedChat.userData?.full_name ||
                          selectedChat.name ||
                          "U"
                        )
                          ?.charAt(0)
                          .toUpperCase()}
                      </div>
                    </IndicatorWrapper>

                    <div>
                      <h3
                        className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {selectedChat.userData?.name ||
                          selectedChat.userData?.full_name ||
                          selectedChat.name ||
                          "Chat"}
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectedChat.userData?.role && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(selectedChat.userData.role)}`}
                          >
                            {selectedChat.userData.role}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              connectionStatus === "connected"
                                ? "bg-green-500"
                                : connectionStatus === "connecting"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          ></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {connectionStatus === "connected"
                              ? "Real-time"
                              : connectionStatus === "connecting"
                                ? "Connecting..."
                                : "Offline"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connection Status Banner */}
                {connectionStatus === "disconnected" && (
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <span>
                        ⚠️ Real-time connection failed. Messages may not update
                        automatically.
                      </span>
                      <button
                        onClick={() => {
                          if (selectedChat) {
                            console.log("🔄 Refreshing messages...");
                            loadMessages(selectedChat.id);
                          }
                        }}
                        className="animate-spin ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                      >
                        Refresh Messages
                      </button>
                      <button
                        onClick={() => {
                          if (selectedChat) {
                            console.log("🔄 Retrying real-time connection...");
                            const channel = subscribeToChat(selectedChat.id);
                            // Store channel for cleanup
                            (selectedChat as any)._realtimeChannel = channel;
                          }
                        }}
                        className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages - WhatsApp Style */}
                {selectedChat?.loading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Loading messages...</p>
                    </div>
                  </div>
                ) : (
                  <WhatsAppMessageList
                    messages={chatMessages}
                    currentUserId={getCurrentUserId()}
                    onRetryMessage={retryMessage}
                    darkMode={darkMode}
                  />
                )}

                <div ref={messagesEndRef} />

                {/* Typing Indicator - Only show when someone is actually typing */}
                {currentChatTypingUsers.length > 0 && (
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                      <span className="text-xs">
                        {currentChatTypingUsers.length === 1
                          ? `${currentChatTypingUsers[0]} is typing...`
                          : `${currentChatTypingUsers.length} people are typing...`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Message Input - Restrict only for history tab for admin/superadmin/hr */}
                {activeTab === "history" &&
                ["admin", "superadmin", "hr"].includes(getCurrentUserRole()) ? (
                  /* Message restriction for history tab only */
                  <div
                    className={`p-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}
                  >
                    <div
                      className={`text-center text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      You can view conversation history but cannot send messages
                      in archived chats.
                    </div>
                  </div>
                ) : (
                  /* Normal message input for DMs and other tabs */
                  <div
                    className={`p-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          handleTypingChange(e.target.value);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        disabled={isSending}
                        className={`flex-1 px-4 py-2 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode
                            ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                        } ${isSending ? "opacity-50 cursor-not-allowed" : ""}`}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || isSending}
                        className={`p-2 rounded-full transition-colors ${
                          messageInput.trim() && !isSending
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {isSending ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Default view - show welcome message */
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Welcome to Chat</h3>
                  <p className="text-sm">
                    {activeTab === "dms"
                      ? "Select a user to start a conversation"
                      : activeTab === "history"
                        ? "View conversation history and access past chats"
                        : "Check out the latest announcements"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Create Announcement Modal */}
      {showCreateAnnouncement && (
        <CreateAnnouncement
          onSubmit={async (data, publish) => {
            try {
              await createAnnouncement(data, publish);
              setShowCreateAnnouncement(false);
            } catch (error) {
              console.error("Failed to create announcement:", error);
            }
          }}
          onClose={() => setShowCreateAnnouncement(false)}
          darkMode={darkMode}
          loading={announcementsLoading}
        />
      )}
    </>
  );
}
