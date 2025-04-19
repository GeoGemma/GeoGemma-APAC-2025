// src/components/Sidebar/Sidebar.jsx
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  GitCompare,
  Download,
  Loader
} from 'lucide-react';
import { chatWithGemini } from '../../services/geminiService';
import ChatInput from './ChatInput';
import '../../styles/sidebar.css';
import '../../styles/chat.css';

const Sidebar = ({ showNotification, toggleTimeSeries, toggleComparison, onToggleSidebar }) => {
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { id: 'earth-imagery', title: 'Earth imagery discussion', active: true },
    { id: 'climate', title: 'Climate analysis', active: false },
  ]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Notify parent component about sidebar state changes
  useEffect(() => {
    if (onToggleSidebar) {
      onToggleSidebar(isOpen);
    }
  }, [isOpen, onToggleSidebar]);

  // Listen for prompt submissions from the search bar
  useEffect(() => {
    const handlePromptSubmit = async (event) => {
      const { prompt, response } = event.detail;
      
      // Add user message if prompt exists
      if (prompt) {
        addMessage(prompt, 'user');
        
        // Only process with Gemini if there's no predefined response
        if (!response) {
          setIsLoading(true);
          try {
            // Get response from Gemini
            const geminiResponse = await chatWithGemini(prompt, messages);
            addMessage(geminiResponse, 'system');
          } catch (error) {
            console.error("Error getting response from Gemini:", error);
            showNotification("Failed to get a response. Please try again.", "error");
            addMessage("I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", "system");
          } finally {
            setIsLoading(false);
          }
        }
      }
      
      // Add system response if provided (from map processing)
      if (response) {
        setTimeout(() => {
          addMessage(response, 'system');
        }, 500);
      }
    };
    
    window.addEventListener('prompt-submitted', handlePromptSubmit);
    return () => {
      window.removeEventListener('prompt-submitted', handlePromptSubmit);
    };
  }, [messages, showNotification]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const addMessage = (text, sender) => {
    const newMsg = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);
  };

  const handleNewChat = () => {
    // Create a new chat entry
    const newChatId = `chat-${Date.now()}`;
    const newChat = {
      id: newChatId,
      title: 'New conversation',
      active: true
    };
    
    // Set all other chats to inactive
    const updatedHistory = chatHistory.map(chat => ({
      ...chat,
      active: false
    }));
    
    // Add the new chat to history
    setChatHistory([newChat, ...updatedHistory]);
    
    // Clear messages
    setMessages([]);
    
    // Add a welcome message
    setTimeout(() => {
      addMessage("Hello! I'm GeoGemma. How can I help you explore Earth observation data today?", "system");
    }, 300);
  };

  const handleSendMessage = async (message) => {
    // Add user message
    addMessage(message, 'user');
    
    // Process with Gemini
    setIsLoading(true);
    try {
      const response = await chatWithGemini(message, messages);
      addMessage(response, 'system');
    } catch (error) {
      console.error("Error getting response from Gemini:", error);
      showNotification("Failed to get a response. Please try again.", "error");
      addMessage("I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", "system");
    } finally {
      setIsLoading(false);
    }
  };

  const selectChat = (id) => {
    // Update the active state of chats
    const updatedHistory = chatHistory.map(chat => ({
      ...chat,
      active: chat.id === id
    }));
    
    setChatHistory(updatedHistory);
    
    // In a real app, you would load the messages for this chat from database
    // For now, we'll just simulate it by clearing messages
    setMessages([]);
    
    // Add a message for the selected chat
    setTimeout(() => {
      if (id === 'earth-imagery') {
        addMessage("What would you like to know about Earth observation?", "system");
      } else if (id === 'climate') {
        addMessage("How can I help with your climate analysis today?", "system");
      } else {
        addMessage("Hello! How can I assist you with this conversation?", "system");
      }
    }, 300);
  };

  return (
    <div className={`sidebar ${isOpen ? 'expanded' : 'collapsed'}`}>
      {isOpen ? (
        /* Expanded Sidebar */
        <>
          <div className="sidebar-header">
            <div className="sidebar-slider" onClick={toggleSidebar} title="Collapse sidebar">
              <ChevronLeft size={20} />
            </div>
          </div>
          
          <button 
            className="new-chat-button" 
            onClick={handleNewChat}
            style={{ backgroundColor: '#3166C7', color: 'white' }}
          >
            <Plus size={16} color="white" />
            <span>New chat</span>
          </button>
          
          <div className="sidebar-content">
            <div className="chat-section">
              <h3>RECENT</h3>
              <div className="chat-history">
                {chatHistory.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`chat-item ${chat.active ? 'active' : ''}`}
                    onClick={() => selectChat(chat.id)}
                  >
                    <MessageSquare size={14} />
                    <span>{chat.title}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <MessageSquare size={32} className="empty-icon" />
                  <h4>No messages yet</h4>
                  <p>Start a conversation or use the search bar to explore Earth imagery</p>
                </div>
              ) : (
                <>
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`chat-message ${message.sender === 'user' ? 'chat-message-user' : 'chat-message-system'}`}
                    >
                      <div className="message-avatar">
                        {message.sender === 'user' ? 'You' : 'GG'}
                      </div>
                      <div className="message-content">
                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="chat-message chat-message-system">
                      <div className="message-avatar">GG</div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span>Thinking</span>
                          <div className="typing-dots">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
          
          {/* Chat input component */}
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          
          {/* Analysis tools section */}
          <div className="sidebar-tools">
            <button 
              className="sidebar-tool" 
              title="Time Series Analysis"
              onClick={toggleTimeSeries}
            >
              <Clock size={20} />
            </button>
            <button 
              className="sidebar-tool" 
              title="Comparison Analysis"
              onClick={toggleComparison}
            >
              <GitCompare size={20} />
            </button>
            <button 
              className="sidebar-tool" 
              title="Export Data"
            >
              <Download size={20} />
            </button>
          </div>
        </>
      ) : (
        /* Collapsed Sidebar */
        <>
          <div className="sidebar-collapsed-top">
            <div className="sidebar-slider-collapsed" onClick={toggleSidebar} title="Expand sidebar">
              <ChevronRight size={20} />
            </div>
          </div>
          
          <div className="sidebar-icons">
            <button 
              className="sidebar-icon active"
              title="Chat"
            >
              <MessageSquare size={20} />
            </button>
            
            <button 
              className="sidebar-icon new-chat-icon"
              onClick={() => {
                setIsOpen(true);
                setTimeout(handleNewChat, 300);
              }}
              title="New chat"
              style={{ color: '#3166C7' }}
            >
              <Plus size={20} color="#3166C7" />
            </button>
          </div>
          
          {/* Analysis tools for collapsed sidebar */}
          <div className="sidebar-icons-bottom">
            <button 
              className="sidebar-icon" 
              title="Time Series Analysis"
              onClick={toggleTimeSeries}
            >
              <Clock size={20} />
            </button>
            <button 
              className="sidebar-icon" 
              title="Comparison Analysis"
              onClick={toggleComparison}
            >
              <GitCompare size={20} />
            </button>
            <button 
              className="sidebar-icon"
              title="Export Data"
            >
              <Download size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

Sidebar.propTypes = {
  showNotification: PropTypes.func.isRequired,
  toggleTimeSeries: PropTypes.func,
  toggleComparison: PropTypes.func,
  onToggleSidebar: PropTypes.func
};

Sidebar.defaultProps = {
  toggleTimeSeries: () => {},
  toggleComparison: () => {},
  onToggleSidebar: () => {}
};

export default Sidebar;