document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const examplesContainer = document.getElementById('examples-container');
    const exampleChips = document.querySelectorAll('.example-chip');
    const clearHistoryBtn = document.getElementById('clear-history');
    
    // State variables
    let socket = null;
    let isConnected = false;
    let isWaitingForResponse = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let sessionId = null;
    
    // Example queries
    const examples = [
        "What's the current weather in Tokyo?",
        "Show air quality in Los Angeles",
        "Analyze water resources in California",
        "Create a map of deforestation in Amazon",
        "Calculate carbon footprint of New York City",
        "What's the biodiversity in Costa Rica?"
    ];
    
    // Initialize the chat interface
    function initialize() {
        connectWebSocket();
        setupEventListeners();
        populateExamples();
        
        // Try to restore session from localStorage
        const savedSessionId = localStorage.getItem('chatSessionId');
        if (savedSessionId) {
            sessionId = savedSessionId;
            console.log('Restored session ID:', sessionId);
        }
        
        // Add welcome message
        setTimeout(() => {
            if (!document.querySelector('.assistant-message')) {
                addMessage('assistant', 'Welcome to the GIS AI Agent! How can I help you with geographic information and sustainability analysis today?');
            }
        }, 1000);
    }
    
    // Connect to WebSocket server
    function connectWebSocket() {
        // Use the current host with WebSocket protocol and the correct port
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Try to connect to the same hostname but port 8080
        const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/ws`;
        
        updateConnectionStatus('connecting');
        
        try {
            socket = new WebSocket(wsUrl);
            
            socket.onopen = function() {
                isConnected = true;
                reconnectAttempts = 0;
                updateConnectionStatus('connected');
                sendButton.disabled = false;
                
                // Show examples after successful connection
                if (examplesContainer) {
                    examplesContainer.style.display = 'block';
                }
                
                // Show clear history button if enabled
                if (clearHistoryBtn) {
                    clearHistoryBtn.style.display = 'block';
                }
            };
            
            socket.onclose = function() {
                isConnected = false;
                updateConnectionStatus('disconnected');
                sendButton.disabled = true;
                
                // Try to reconnect after a delay
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectWebSocket, 3000 * reconnectAttempts);
                } else {
                    addMessage('assistant', "I'm having trouble connecting to the server. Please check if the server is running and refresh the page.");
                }
            };
            
            socket.onerror = function(error) {
                console.error('WebSocket Error:', error);
                updateConnectionStatus('error');
            };
            
            socket.onmessage = function(event) {
                handleResponse(event.data);
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            updateConnectionStatus('error');
        }
    }
    
    // Update the connection status display
    function updateConnectionStatus(status) {
        if (!connectionStatus) return;
        
        switch (status) {
            case 'connected':
                connectionStatus.textContent = 'Connected';
                connectionStatus.className = 'status connected';
                break;
            case 'disconnected':
                connectionStatus.textContent = 'Disconnected';
                connectionStatus.className = 'status disconnected';
                break;
            case 'connecting':
                connectionStatus.textContent = 'Connecting...';
                connectionStatus.className = 'status disconnected';
                break;
            case 'error':
                connectionStatus.textContent = 'Connection Error';
                connectionStatus.className = 'status disconnected';
                break;
            default:
                connectionStatus.textContent = 'Unknown';
                connectionStatus.className = 'status disconnected';
        }
    }
    
    // Handle the response from the server
    function handleResponse(data) {
        try {
            const response = JSON.parse(data);
            
            // Remove typing indicator if it exists
            const typingIndicator = document.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Check if this is a session info message
            if (response.type === 'session_info') {
                // Save the session ID
                sessionId = response.session_id;
                localStorage.setItem('chatSessionId', sessionId);
                console.log('New session established:', sessionId);
                return;
            }
            
            // Check if this is a history cleared message
            if (response.type === 'history_cleared') {
                addMessage('assistant', 'Conversation history has been cleared.');
                isWaitingForResponse = false;
                sendButton.disabled = false;
                userInput.disabled = false;
                return;
            }
            
            if (response.error) {
                addMessage('assistant', `Error: ${response.error}`);
            } else if (response.type === 'response') {
                // Handle standard text response from LLM
                addMessage('assistant', response.response || 'I received your message but the response was empty.');
            } else if (response.type === 'tool_result') {
                // Handle the result of a tool execution
                let toolOutput = ""; // Initialize output string
                
                // Check if the tool returned an error or a result
                if (response.result && response.result.error) {
                    toolOutput = `Tool Error: ${response.result.error}`;
                } else if (response.result && typeof response.result.result !== 'undefined') {
                    // Format the successful result
                    const actualResult = response.result.result;
                    if (typeof actualResult === 'object' && actualResult !== null) {
                        // Format object/array as JSON code block
                        toolOutput = 'Result:\n```json\n' + JSON.stringify(actualResult, null, 2) + '\n```';
                    } else {
                        // Display primitive types directly
                        toolOutput = `Result: ${actualResult}`;
                    }
                } else {
                    // Fallback for unexpected structure
                    toolOutput = `Result (raw): ${JSON.stringify(response.result)}`;
                }
                
                // Construct the full message
                const messageContent = `Tool \`${response.tool_name}\` executed.\nArguments: ${JSON.stringify(response.arguments)}\n${toolOutput}`;
                addMessage('assistant', messageContent);
            } else if (response.type === 'tool_result_with_analysis') {
                // Handle tool result with AI analysis
                
                // First, display the tool result data
                let toolOutput = ""; // Initialize output string
                if (response.result && response.result.error) {
                    toolOutput = `Tool Error: ${response.result.error}`;
                } else if (response.result && typeof response.result.result !== 'undefined') {
                    // Format the successful result
                    const actualResult = response.result.result;
                    if (typeof actualResult === 'object' && actualResult !== null) {
                        // Format object/array as JSON code block
                        toolOutput = 'Data:\n```json\n' + JSON.stringify(actualResult, null, 2) + '\n```';
                    } else {
                        // Display primitive types directly
                        toolOutput = `Data: ${actualResult}`;
                    }
                } else {
                    // Fallback for unexpected structure
                    toolOutput = `Data (raw): ${JSON.stringify(response.result)}`;
                }
                
                // Create the data message with smaller text size
                const dataMessage = `Tool \`${response.tool_name}\` executed.\nArguments: ${JSON.stringify(response.arguments)}\n${toolOutput}`;
                
                // Add the raw data message
                addMessage('assistant', dataMessage);
                
                // Add typing indicator to simulate thinking about the data
                addTypingIndicator();
                
                // Remove typing indicator after a short delay
                setTimeout(() => {
                    // Remove typing indicator
                    const typingIndicator = document.querySelector('.typing-indicator');
                    if (typingIndicator) {
                        typingIndicator.remove();
                    }
                    
                    // Add the analysis as a separate message
                    if (response.analysis) {
                        addMessage('assistant', response.analysis);
                    } else {
                        addMessage('assistant', "I couldn't generate an analysis for these results.");
                    }
                }, 1500);
            } else if (response.response && response.response.text) {
                // Fallback for older response format (might still include tool calls)
                addMessage('assistant', response.response.text);
                if (response.response.tool_calls && response.response.tool_calls.length > 0) {
                    // Optionally log or indicate that a tool was called but result is handled separately
                    console.log('Tool call info received with text response:', response.response.tool_calls);
                }
            } else {
                addMessage('assistant', 'I received an unexpected response format.');
                console.log("Unexpected response format:", response);
            }
            
            isWaitingForResponse = false;
            sendButton.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        } catch (error) {
            console.error('Error parsing or handling response:', error, "Raw data:", data);
            addMessage('assistant', 'Sorry, I encountered an error processing the response.');
            
            isWaitingForResponse = false;
            sendButton.disabled = false;
            userInput.disabled = false;
        }
    }
    
    // Add a message to the chat
    function addMessage(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = role === 'user' ? 'message user-message' : 'message assistant-message';
        
        // Process markdown-like formatting
        let formattedText = text
            .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')  // Code blocks
            .replace(/\n/g, '<br>');  // Line breaks
        
        messageDiv.innerHTML = formattedText;
        
        // Add time
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = getCurrentTime();
        messageDiv.appendChild(timeDiv);
        
        chatArea.appendChild(messageDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Add a typing indicator
    function addTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'message assistant-message typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            indicatorDiv.appendChild(dot);
        }
        
        chatArea.appendChild(indicatorDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Get current time in HH:MM format
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Send message
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (message && isConnected && !isWaitingForResponse) {
            // Add the user's message to the chat
            addMessage('user', message);
            
            // Clear the input
            userInput.value = '';
            
            // Show typing indicator
            addTypingIndicator();
            
            // Disable the input and button while waiting for a response
            isWaitingForResponse = true;
            sendButton.disabled = true;
            userInput.disabled = true;
            
            // Send the message to the server
            const query = {
                type: 'query',
                query: message
            };
            
            // Add session ID if available
            if (sessionId) {
                query.session_id = sessionId;
            }
            
            socket.send(JSON.stringify(query));
        }
    }
    
    // Clear chat history
    function clearHistory() {
        if (!isConnected || !sessionId) return;
        
        // Show user this action was taken
        addMessage('user', 'Clear my conversation history');
        
        // Show typing indicator
        addTypingIndicator();
        
        // Disable the input and button while waiting for a response
        isWaitingForResponse = true;
        sendButton.disabled = true;
        userInput.disabled = true;
        
        // Send clear history request
        const clearRequest = {
            type: 'clear_history',
            session_id: sessionId
        };
        
        socket.send(JSON.stringify(clearRequest));
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Send button click
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }
        
        // Enter key press
        if (userInput) {
            userInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            });
        }
        
        // Example chips click
        if (exampleChips) {
            exampleChips.forEach(chip => {
                chip.addEventListener('click', function() {
                    if (!isWaitingForResponse && isConnected) {
                        userInput.value = this.textContent;
                        sendMessage();
                    }
                });
            });
        }
        
        // Clear history button
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', clearHistory);
        }
    }
    
    // Populate example chips
    function populateExamples() {
        const exampleChipsContainer = document.querySelector('.example-chips');
        if (!exampleChipsContainer) return;
        
        // Clear existing examples
        exampleChipsContainer.innerHTML = '';
        
        // Add example chips
        examples.forEach(example => {
            const chip = document.createElement('div');
            chip.className = 'example-chip';
            chip.textContent = example;
            chip.addEventListener('click', function() {
                if (!isWaitingForResponse && isConnected) {
                    userInput.value = this.textContent;
                    sendMessage();
                }
            });
            exampleChipsContainer.appendChild(chip);
        });
    }
    
    // Start the initialization
    initialize();
}); 