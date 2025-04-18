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
  Download
} from 'lucide-react';
import '../../styles/sidebar.css';

const Sidebar = ({ showNotification, toggleTimeSeries, toggleComparison, onToggleSidebar }) => {
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed
  const [messages, setMessages] = useState([]);
  const [activeSection, setActiveSection] = useState('chat');
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
    const handlePromptSubmit = (event) => {
      const { prompt, response } = event.detail;
      
      // Add user message if prompt exists
      if (prompt) {
        addMessage(prompt, 'user');
      }
      
      // Add system response if provided
      if (response) {
        setTimeout(() => {
          addMessage(response, 'system');
        }, 500); // Small delay to simulate response time
      }
    };
    
    window.addEventListener('prompt-submitted', handlePromptSubmit);
    return () => {
      window.removeEventListener('prompt-submitted', handlePromptSubmit);
    };
  }, []);

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
    setMessages([]);
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
          
          {/* Removed the sidebar-tabs section with Layers and Library options */}
          
          <button 
            className="new-chat-button" 
            onClick={handleNewChat}
            style={{ backgroundColor: '#3166C7', color: 'white' }}
          >
            <Plus size={16} color="white" />
            <span>New chat</span>
          </button>
          
          <div className="sidebar-content">
            {/* Only displaying chat content since other tabs are removed */}
            <div className="chat-section">
              <h3>RECENT</h3>
              <div className="chat-history">
                <div className="chat-item active">
                  <MessageSquare size={14} />
                  <span>Earth imagery discussion</span>
                </div>
                <div className="chat-item">
                  <MessageSquare size={14} />
                  <span>Climate analysis</span>
                </div>
              </div>
            </div>
            
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <MessageSquare size={32} className="empty-icon" />
                  <h4>No messages yet</h4>
                  <p>Use the search bar below to explore Earth imagery</p>
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
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
          
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
            {/* Showing only Chat icon */}
            <button 
              className="sidebar-icon active"
              title="Chat"
            >
              <MessageSquare size={20} />
            </button>
            
            {/* Removed Layers and Library icons */}
            
            <button 
              className="sidebar-icon new-chat-icon"
              onClick={handleNewChat}
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