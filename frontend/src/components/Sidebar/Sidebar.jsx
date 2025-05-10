// src/components/Sidebar/Sidebar.jsx
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,           // Keep icon for display
  GitCompare,      // Keep icon for display
  Download,        // Keep icon for display
  Shapes,          // New icon for GeoJSON
  Loader,
  MapPin,          // New icon for GIS Agent
  Pencil,          // Add Pencil for rename
  Trash2          // Add Trash2 for delete
} from 'lucide-react'; // Ensure Shapes is imported
import { chatWithGemini } from '../../services/geminiService'; // Keep chat logic
import ChatInput from './ChatInput'; // Keep chat logic
import GISAgentUI from './GISAgentUI'; // New GIS Agent UI component
import '../../styles/sidebar.css';
import '../../styles/chat.css';

// Removed toggleTimeSeries, toggleComparison from props as they are no longer needed
const Sidebar = ({ showNotification, onToggleSidebar }) => {
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeSection, setActiveSection] = useState('chat'); // 'chat' or 'gisagent'
  const messagesEndRef = useRef(null);
  const [editingChatId, setEditingChatId] = useState(null); // Track which chat is being renamed
  const [editingTitle, setEditingTitle] = useState('');     // Track the new title input

  // --- Chat logic (useEffect, addMessage, handleNewChat, handleSendMessage, selectChat) remains the same ---
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

      // Ensure we're in the chat section
      setActiveSection('chat');

      // Ensure a chat context exists or create one
      if (chatHistory.length === 0 && (prompt || response)) {
          // Create a new chat immediately and update state
          const newChatId = `chat-${Date.now()}`;
          const newChat = { id: newChatId, title: prompt ? prompt.substring(0, 25) : 'New conversation', active: true };
          const updatedHistory = [{ ...newChat }, ...chatHistory.map(c => ({ ...c, active: false }))];

          setChatHistory(updatedHistory);
          setMessages([]); // Clear messages for the new chat

          // Add welcome message for new chat
          setTimeout(() => {
              addMessage("Hello! Let's explore this topic.", "system");
          }, 100);

          // Now add the submitted prompt/response to the *newly* created chat context
          // Need a slight delay to ensure state update potentially finishes
          setTimeout(() => {
              if (prompt) {
                  addMessage(prompt, 'user');
              }
              if (response) {
                  addMessage(response, 'system');
              }
              // Handle Gemini call if needed after adding prompt
              if (prompt && !response) {
                  callGemini(prompt);
              }
          }, 150);

          return; // Stop further processing in this event handler instance
      }

      // Add to existing active chat
      let currentMessages = [...messages]; // Get current messages

      if (prompt) {
        const userMsg = { id: Date.now() + Math.random(), text: prompt, sender: 'user', timestamp: new Date().toISOString() };
        currentMessages.push(userMsg);
        setMessages(currentMessages); // Update state immediately
      }

      if (response) {
          // Add system response (potentially delayed slightly)
          setTimeout(() => {
              const sysMsg = { id: Date.now() + Math.random(), text: response, sender: 'system', timestamp: new Date().toISOString() };
               // Update based on the state *when the timeout fires*
              setMessages(prev => [...prev, sysMsg]);
          }, 150);
      }

       // Process with Gemini only if prompt exists and no predefined response
      if (prompt && !response) {
          callGemini(prompt, currentMessages); // Pass current messages to Gemini context
      }
    };

    const callGemini = async (prompt, contextMessages = messages) => {
       setIsLoading(true);
        try {
            const geminiResponse = await chatWithGemini(prompt, contextMessages);
            addMessage(geminiResponse, 'system');
        } catch (error) {
            console.error("Error getting response from Gemini:", error);
            showNotification("Failed to get a response. Please try again.", "error");
            addMessage("I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", "system");
        } finally {
            setIsLoading(false);
        }
    }

    window.addEventListener('prompt-submitted', handlePromptSubmit);
    return () => {
      window.removeEventListener('prompt-submitted', handlePromptSubmit);
    };
    // Removed messages from dependency array here to avoid potential re-triggering issues, manage context inside handler
  }, [showNotification, isOpen, chatHistory]); // Depend on isOpen and chatHistory to know context


  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const addMessage = (text, sender) => {
    const newMsg = {
      id: Date.now() + Math.random(), // Add random factor for quick succession
      text,
      sender,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => {
       // Avoid adding duplicate system messages if they arrive too close together
       if (sender === 'system' && prev.length > 0 && prev[prev.length - 1].text === text) {
           return prev;
       }
       return [...prev, newMsg];
    });
    // Update chat title based on first user message if it's 'New conversation'
    if(sender === 'user' && chatHistory.length > 0 && chatHistory[0].active && chatHistory[0].title === 'New conversation') {
        const updatedHistory = [...chatHistory];
        updatedHistory[0].title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        setChatHistory(updatedHistory);
    }
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
    
    // Set active section to chat
    setActiveSection('chat');

    // Add a welcome message
    setTimeout(() => {
      addMessage("Hello! I'm GeoGemma. How can I help you explore Earth observation data today?", "system");
    }, 300);
  };

  const handleSendMessage = async (message) => {
     // Ensure there's an active chat, create if not
     if (!chatHistory.some(chat => chat.active)) {
         handleNewChat();
         // Need a slight delay for state to update before sending message
         setTimeout(() => handleSendMessage(message), 100);
         return;
     }
    // Add user message
    addMessage(message, 'user');

    // Process with Gemini
    setIsLoading(true);
    try {
       // Pass the current message history to Gemini
      const response = await chatWithGemini(message, [...messages, {text: message, sender: 'user'}]);
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
    
    // Make sure we're in the chat section
    setActiveSection('chat');

    // In a real app, you would load the messages for this chat from database
    // For now, we'll just simulate it by clearing messages and adding a placeholder
    setMessages([{id: Date.now(), text: `Loading messages for ${updatedHistory.find(c=>c.active)?.title || 'chat'}...`, sender:'system'}]);

    // Simulate loading messages (replace with actual fetch)
    setTimeout(() => {
      setMessages([
          {id: Date.now()+1, text: "Welcome back to this conversation!", sender: 'system'}
          // Add previously saved messages here
      ]);
    }, 500);
  };
  // --- End of Chat Logic ---


  // --- NEW: Handler for Coming Soon ---
  const handleComingSoon = (featureName) => {
    showNotification(`${featureName} feature coming soon!`, 'info');
  };
  // --- END NEW ---
  
  // Toggle between chat and GIS Agent sections
  const toggleSection = (section) => {
    setActiveSection(section);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Handler to start renaming a chat
  const handleRenameChat = (chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  // Handler to save the new chat title
  const handleRenameSave = (chatId) => {
    const updatedHistory = chatHistory.map(chat =>
      chat.id === chatId ? { ...chat, title: editingTitle } : chat
    );
    setChatHistory(updatedHistory);
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Handler to cancel renaming
  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Handler to delete a chat
  const handleDeleteChat = (chatId) => {
    const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updatedHistory);
    // If the deleted chat was active, clear messages
    if (chatHistory.find(chat => chat.id === chatId)?.active) {
      setMessages([]);
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'expanded' : 'collapsed'}`}>
      {isOpen ? (
        /* --- Expanded Sidebar --- */
        <>
          <div className="sidebar-header">
            <div className="sidebar-slider" onClick={toggleSidebar} title="Collapse sidebar">
              <ChevronLeft size={20} />
            </div>
            
            {/* Section switcher */}
            <div className="section-switcher">
              <button 
                className={`section-btn ${activeSection === 'chat' ? 'active' : ''}`}
                onClick={() => toggleSection('chat')}
                title="Chat"
              >
                <MessageSquare size={16} />
                <span>Chat</span>
              </button>
              <button 
                className={`section-btn ${activeSection === 'gisagent' ? 'active' : ''}`}
                onClick={() => toggleSection('gisagent')}
                title="GIS Agent"
              >
                <MapPin size={16} />
                <span>GIS Agent</span>
              </button>
            </div>
          </div>

          {activeSection === 'chat' ? (
            // Chat Section
            <>
              <button
                className="new-chat-button"
                onClick={handleNewChat}
                // Use CSS variables or direct styles
                style={{ backgroundColor: 'rgb(var(--color-primary))', color: 'rgb(var(--color-bg-dark))' }}
              >
                <Plus size={16} />
                <span>New chat</span>
              </button>

              <div className="sidebar-content">
                {/* --- Chat History Section --- */}
                {chatHistory.length > 0 && (
                  <div className="chat-section">
                    {/* Optional: Hide title if only one chat exists? */}
                    {chatHistory.length > 1 && <h3>RECENT</h3>}
                    <div className="chat-history">
                      {chatHistory.map((chat) => (
                        <div
                          key={chat.id}
                          className={`chat-item ${chat.active ? 'active' : ''}`}
                          onClick={() => selectChat(chat.id)}
                          title={chat.title}
                          style={{ position: 'relative' }}
                        >
                          <MessageSquare size={14} />
                          {editingChatId === chat.id ? (
                            <>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={e => setEditingTitle(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenameSave(chat.id);
                                  if (e.key === 'Escape') handleRenameCancel();
                                }}
                                autoFocus
                                style={{
                                  maxWidth: 120,
                                  marginRight: 4,
                                  background: '#222',
                                  color: '#e8eaed',
                                  border: '1px solid #444',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  fontSize: 14
                                }}
                              />
                              <button
                                className="sidebar-tool"
                                title="Save"
                                onClick={e => { e.stopPropagation(); handleRenameSave(chat.id); }}
                              >
                                <Loader size={14} />
                              </button>
                              <button
                                className="sidebar-tool"
                                title="Cancel"
                                onClick={e => { e.stopPropagation(); handleRenameCancel(); }}
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1, minWidth: 0, marginRight: 4 }}>{chat.title}</span>
                              <button
                                className="sidebar-tool"
                                title="Rename chat"
                                onClick={e => { e.stopPropagation(); handleRenameChat(chat); }}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="sidebar-tool"
                                title="Delete chat"
                                onClick={e => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- Chat Messages Section --- */}
                <div className="chat-messages">
                  {messages.length === 0 && chatHistory.length === 0 ? ( // Show only if NO chats exist
                    <div className="empty-chat">
                      <MessageSquare size={32} className="empty-icon" />
                      <h4>No messages yet</h4>
                      <p>Start a conversation or use the search bar to explore Earth imagery</p>
                    </div>
                  ) : (
                    messages.length === 0 && chatHistory.some(c => c.active) ? ( // Show if chat exists but is empty
                        <div className="empty-chat">
                            <p>Send a message to start exploring...</p>
                        </div>
                    ) : (
                        <>
                        {messages.map(message => (
                            <div
                            key={message.id}
                            className={`chat-message ${message.sender === 'user' ? 'chat-message-user' : 'chat-message-system'}`}
                            >
                            <div className={`message-avatar ${message.sender === 'user' ? 'avatar-user' : 'avatar-system'}`}>
                                {/* Placeholder initials or icons */}
                                {message.sender === 'user' ? 'U' : 'G'}
                            </div>
                            <div className="message-content">
                                {/* Basic markdown rendering could be added here */}
                                <p>{message.text}</p>
                            </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-message chat-message-system">
                            <div className="message-avatar avatar-system">G</div>
                            <div className="message-content">
                                <div className="typing-indicator">
                                    {/* Using Loader icon */}
                                    <Loader size={16} className="animate-spin"/>
                                    <span>Thinking...</span>
                                </div>
                            </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                        </>
                    )
                  )}
                </div>
              </div>

              {/* Chat input component */}
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </>
          ) : (
            // GIS Agent Section
            <GISAgentUI showNotification={showNotification} />
          )}

          {/* --- Analysis tools section (MODIFIED) --- */}
          <div className="sidebar-tools">
            {/* Time Series -> Coming Soon */}
            <button
              className="sidebar-tool"
              title="Time Series Analysis (Coming Soon)"
              onClick={() => handleComingSoon('Time Series Analysis')}
            >
              <Clock size={20} />
            </button>
            {/* Comparison -> Coming Soon */}
            <button
              className="sidebar-tool"
              title="Comparison Analysis (Coming Soon)"
              onClick={() => handleComingSoon('Comparison Analysis')}
            >
              <GitCompare size={20} />
            </button>
             {/* Add GeoJSON -> Coming Soon */}
            <button
              className="sidebar-tool"
              title="Add Custom GeoJSON (Coming Soon)"
               onClick={() => handleComingSoon('Add Custom GeoJSON')}
            >
              <Shapes size={20} /> {/* Use Shapes icon */}
            </button>
            {/* Export -> Coming Soon */}
            <button
              className="sidebar-tool"
              title="Export Data (Coming Soon)"
              onClick={() => handleComingSoon('Export Data')}
            >
              <Download size={20} />
            </button>
          </div>
        </>
      ) : (
        /* --- Collapsed Sidebar --- */
        <>
          <div className="sidebar-collapsed-top">
            <div className="sidebar-slider-collapsed" onClick={toggleSidebar} title="Expand sidebar">
              <ChevronRight size={20} />
            </div>
          </div>

          <div className="sidebar-icons">
            {/* Chat icon */}
            <button
              className={`sidebar-icon ${activeSection === 'chat' ? 'active' : ''}`}
              title="Chat"
              onClick={() => {
                toggleSection('chat');
                setIsOpen(true);
              }}
            >
              <MessageSquare size={20} />
            </button>
            
            {/* GIS Agent icon */}
            <button
              className={`sidebar-icon ${activeSection === 'gisagent' ? 'active' : ''}`}
              title="GIS Agent"
              onClick={() => {
                toggleSection('gisagent');
                setIsOpen(true);
              }}
            >
              <MapPin size={20} />
            </button>

            <button
              className="sidebar-icon new-chat-icon"
              onClick={() => {
                setIsOpen(true);
                // Delay handleNewChat slightly to allow sidebar animation
                setTimeout(handleNewChat, 150);
              }}
              title="New chat"
               // Use CSS variables or direct styles
              style={{ color: 'rgb(var(--color-primary))' }}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* --- Analysis tools for collapsed sidebar (MODIFIED) --- */}
          <div className="sidebar-icons-bottom">
            {/* Time Series -> Coming Soon */}
            <button
              className="sidebar-icon"
              title="Time Series Analysis (Coming Soon)"
              onClick={() => handleComingSoon('Time Series Analysis')}
            >
              <Clock size={20} />
            </button>
             {/* Comparison -> Coming Soon */}
            <button
              className="sidebar-icon"
              title="Comparison Analysis (Coming Soon)"
               onClick={() => handleComingSoon('Comparison Analysis')}
            >
              <GitCompare size={20} />
            </button>
             {/* Add GeoJSON -> Coming Soon */}
            <button
              className="sidebar-icon"
              title="Add Custom GeoJSON (Coming Soon)"
              onClick={() => handleComingSoon('Add Custom GeoJSON')}
            >
              <Shapes size={20} /> {/* Use Shapes icon */}
            </button>
            {/* Export -> Coming Soon */}
            <button
              className="sidebar-icon"
              title="Export Data (Coming Soon)"
               onClick={() => handleComingSoon('Export Data')}
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
  // Removed toggleTimeSeries, toggleComparison props
  onToggleSidebar: PropTypes.func
};

// Removed defaultProps for removed functions
Sidebar.defaultProps = {
  onToggleSidebar: () => {}
};

export default Sidebar;
