// src/components/Sidebar/Sidebar.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, Plus, MessageCircle, MoreVertical } from 'lucide-react';
import './sidebar.css';

const Sidebar = ({ showNotification }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  // Function to handle the creation of a new chat
  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New conversation",
      messages: [],
      timestamp: new Date()
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setActiveChat(newChat.id);
    showNotification("New chat created", "success");
  };

  // Listen for new prompts and update chat history
  useEffect(() => {
    // Listen for prompt submissions
    const handlePromptSubmission = (event) => {
      if (event.detail && event.detail.prompt) {
        const { prompt, response } = event.detail;
        
        // Create a new chat if none is active
        if (!activeChat) {
          const newChat = {
            id: Date.now(),
            title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
            messages: [
              { type: 'user', content: prompt },
              { type: 'system', content: response || 'Processing...' }
            ],
            timestamp: new Date()
          };
          
          setChatHistory(prev => [newChat, ...prev]);
          setActiveChat(newChat.id);
        } else {
          // Update existing chat
          setChatHistory(prev => prev.map(chat => {
            if (chat.id === activeChat) {
              // Update chat with new messages
              const updatedChat = {
                ...chat,
                messages: [
                  ...chat.messages,
                  { type: 'user', content: prompt },
                  { type: 'system', content: response || 'Processing...' }
                ],
                // Update title based on first prompt if it's a "New conversation"
                title: chat.title === "New conversation" 
                  ? prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '')
                  : chat.title
              };
              return updatedChat;
            }
            return chat;
          }));
        }
      }
    };

    // Create a custom event listener for prompt submissions
    window.addEventListener('prompt-submitted', handlePromptSubmission);
    
    return () => {
      window.removeEventListener('prompt-submitted', handlePromptSubmission);
    };
  }, [activeChat, showNotification]);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const selectChat = (chatId) => {
    setActiveChat(chatId);
  };

  return (
    <div className={`fixed left-0 sidebar-with-topbar bg-background-dark z-10 transition-all duration-300 border-r border-background-light/10 ${isExpanded ? 'w-72' : 'w-12'}`}>
      {/* Sidebar Toggle (only shown when collapsed) */}
      {!isExpanded && (
        <button 
          onClick={toggleSidebar}
          className="absolute top-4 left-0 right-0 text-google-grey-300 hover:text-white p-1 mx-auto flex justify-center"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Sidebar Content - only shown when expanded */}
      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* New Chat Button - Now placed at the top */}
          <div className="px-3 pt-4 pb-4">
            <button 
              className="w-full bg-google-red/80 hover:bg-google-red text-white rounded-full py-1.5 px-3 flex items-center justify-center gap-1 transition-colors text-sm font-medium"
              onClick={handleNewChat}
            >
              <Plus size={16} />
              <span>New chat</span>
            </button>
          </div>

          {/* Chats Navigation */}
          <div className="mb-1">
            <button className="flex items-center w-full px-3 py-2 text-sm text-white bg-background-light/20 hover:bg-background-light/30">
              <MessageCircle size={16} className="mr-3" />
              <span>Chats</span>
            </button>
          </div>

          {/* Recents Section */}
          <div className="mt-3">
            <h3 className="px-4 text-xs font-medium text-google-grey-400">Recents</h3>
          </div>

          {/* Chat History Section */}
          <div className="flex-1 overflow-y-auto scrollbar-custom mt-1 px-2">
            {chatHistory.length > 0 ? (
              <div className="space-y-0.5">
                {chatHistory.map(chat => (
                  <div 
                    key={chat.id} 
                    className={`chat-item group ${chat.id === activeChat ? 'bg-background-light/20' : ''}`}
                    onClick={() => selectChat(chat.id)}
                  >
                    <span className="truncate text-sm">{chat.title}</span>
                    
                    <button 
                      className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatHistory(prev => prev.filter(c => c.id !== chat.id));
                        if (activeChat === chat.id) {
                          setActiveChat(null);
                        }
                      }}
                    >
                      <MoreVertical size={14} className="text-google-grey-300" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-google-grey-400 text-xs py-4 px-4">
                No recent chats
              </div>
            )}
          </div>
          
          {/* Toggle button at bottom */}
          <div className="p-2 mt-auto border-t border-background-light/10">
            <button 
              onClick={toggleSidebar}
              className="flex items-center justify-end w-full text-google-grey-400 hover:text-white text-xs p-1"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

Sidebar.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default Sidebar;