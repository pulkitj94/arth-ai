import { useState, useRef, useEffect } from 'react';
import { APP_CONFIG } from '../config';
import { sendMessage } from '../api/client';
import StructuredDataDisplay from '../components/StructuredDataDisplay';
import ClarificationDialog from '../components/ClarificationDialog';
import { useQueryHistory } from '../hooks/useQueryHistory';

function MessageContent({ content }) {
  const formatText = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('###')) {
          return `<h3 class="text-base font-semibold mt-3 mb-1">${line.replace('###', '').trim()}</h3>`;
        }
        if (line.startsWith('##')) {
          return `<h2 class="text-lg font-semibold mt-4 mb-2">${line.replace('##', '').trim()}</h2>`;
        }
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return `<li class="ml-4">${line.replace(/^[•\-]\s*/, '')}</li>`;
        }
        return `<p class="my-1">${line}</p>`;
      })
      .join('');
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: formatText(content) }}
      className="text-sm leading-relaxed"
    />
  );
}

function CommandCenter() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSamples, setShowSamples] = useState(true);
  const [clarificationData, setClarificationData] = useState(null);
  const [showClarification, setShowClarification] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(
    APP_CONFIG.sampleQueries.reduce((acc, category, idx) => {
      acc[idx] = category.defaultExpanded || false;
      return acc;
    }, {})
  );
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const { history, addQuery, clearHistory } = useQueryHistory();



  const toggleCategory = (idx) => {
    setExpandedCategories(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message on mount and scroll to top
  useEffect(() => {
    if (APP_CONFIG.welcomeMessage.show) {
      setMessages([{
        type: 'assistant',
        content: `**${APP_CONFIG.welcomeMessage.title}**\n\n${APP_CONFIG.welcomeMessage.content}`,
        timestamp: new Date()
      }]);
    }
    // Scroll to top on initial load
    scrollToTop();
  }, []);

  const handleStopGeneration = () => {
    setIsLoading(false);
    const stopMessage = {
      type: 'assistant',
      content: '⚠️ Generation stopped by user.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, stopMessage]);
  };

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    addQuery(messageText);

    try {
      const response = await sendMessage(messageText);

      if (response.needsClarification) {
        setClarificationData(response.clarification);
        setShowClarification(true);
        setPendingQuery(messageText);
        setIsLoading(false);
        return;
      }

      const assistantMessage = {
        type: 'assistant',
        content: response.response || response.narrative,
        data: response.data,
        insights: response.insights,
        narrative: response.narrative,
        metadata: response.metadata,
        processingTime: response.metadata?.processingTimeMs
          ? (response.metadata.processingTimeMs / 1000).toFixed(2)
          : response.processingTime,
        timestamp: new Date(response.timestamp || Date.now())
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: `Error: ${error.message}. Please make sure the server is running.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSelect = async (option) => {
    setShowClarification(false);
    let selectedText;
    if (typeof option === 'string') {
      selectedText = option;
    } else if (typeof option === 'object' && option !== null) {
      selectedText = option.label || option.option || option.query || String(option);
    } else {
      selectedText = String(option);
    }

    const clarificationMessage = {
      type: 'assistant',
      content: `You selected: **${selectedText}**\n\nProcessing your request...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, clarificationMessage]);

    if (selectedText.toLowerCase().includes('rephrase') ||
      selectedText.toLowerCase().includes('let me rephrase')) {
      setClarificationData(null);
      setPendingQuery('');
      const cancelMessage = {
        type: 'assistant',
        content: 'No problem! Feel free to ask your question in a different way.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cancelMessage]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await sendMessage(selectedText);

      const assistantMessage = {
        type: 'assistant',
        content: response.response || response.narrative,
        data: response.data,
        insights: response.insights,
        narrative: response.narrative,
        metadata: response.metadata,
        processingTime: response.metadata?.processingTimeMs
          ? (response.metadata.processingTimeMs / 1000).toFixed(2)
          : response.processingTime,
        timestamp: new Date(response.timestamp || Date.now())
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: `Error: ${error.message}. Please make sure the server is running.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setClarificationData(null);
      setPendingQuery('');
    }
  };

  const handleClarificationCancel = () => {
    setShowClarification(false);
    setClarificationData(null);
    setPendingQuery('');
    const cancelMessage = {
      type: 'assistant',
      content: 'No problem! Feel free to rephrase your question.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ClarificationDialog
        clarification={clarificationData}
        onSelect={handleClarificationSelect}
        onCancel={handleClarificationCancel}
        isOpen={showClarification}
      />

      <div className="flex gap-6 relative">
        {/* Chat Area */}
        <div className={`flex-1 transition-all duration-300 ${showSamples ? 'pr-[440px]' : 'pr-0'}`}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-3 ${message.type === 'user'
                      ? 'bg-brand text-white'
                      : message.type === 'error'
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                      }`}
                  >
                    {message.type === 'user' ? (
                      <div className="prose prose-sm max-w-none">
                        <MessageContent content={message.content} />
                      </div>
                    ) : message.type === 'error' ? (
                      <div className="prose prose-sm max-w-none">
                        <MessageContent content={message.content} />
                      </div>
                    ) : (
                      <StructuredDataDisplay
                        data={message.data}
                        insights={message.insights}
                        narrative={message.narrative || message.content}
                        metadata={message.metadata}
                      />
                    )}
                    {message.processingTime && APP_CONFIG.ui.showProcessingTime && (
                      <div className="text-xs text-gray-500 mt-2">
                        ⏱️ {message.processingTime}s
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-brand rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {APP_CONFIG.ui.loadingMessages[Math.floor(Math.random() * APP_CONFIG.ui.loadingMessages.length)]}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 relative">
              {showHistory && (
                <div className="absolute bottom-20 right-20 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      Recent Queries
                    </h3>
                    {history.length > 0 && (
                      <button
                        onClick={() => { clearHistory(); setShowHistory(false); }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {history.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">
                        No recent history
                      </div>
                    ) : (
                      history.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            handleSendMessage(item.query);
                            setShowHistory(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 group"
                        >
                          <p className="text-sm text-gray-700 group-hover:text-indigo-700 truncate font-medium" title={item.query}>{item.query}</p>
                          <span className="text-xs text-gray-400 mt-0.5 block">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={APP_CONFIG.ui.placeholderText}
                    maxLength={APP_CONFIG.ui.maxMessageLength}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    disabled={isLoading}
                    onFocus={() => setShowHistory(false)}
                  />
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-3 rounded-lg border transition-colors ${showHistory
                      ? 'bg-indigo-100 border-indigo-200 text-indigo-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    title="View Query History"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </button>
                  {isLoading ? (
                    <button
                      onClick={handleStopGeneration}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <rect x="6" y="6" width="8" height="8" />
                      </svg>
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim()}
                      className="bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {APP_CONFIG.ui.submitButtonText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Drawer */}
        {APP_CONFIG.ui.showSampleQueries && (
          <>
            {/* Toggle Button (Always Visible) */}
            <button
              onClick={() => setShowSamples(!showSamples)}
              className={`fixed top-1/2 -translate-y-1/2 z-50 bg-white shadow-lg border border-gray-200 rounded-l-lg p-3 hover:bg-gray-50 transition-all duration-300 ${showSamples ? 'right-[420px]' : 'right-0'
                }`}
              aria-label={showSamples ? "Hide sample queries" : "Show sample queries"}
            >
              {showSamples ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>

            {/* Drawer Panel */}
            <div
              className={`fixed top-16 right-0 h-[calc(100vh-64px)] bg-gradient-to-b from-gray-50 to-white shadow-2xl border-l border-gray-200 transition-transform duration-300 ease-in-out z-40 ${showSamples ? 'translate-x-0' : 'translate-x-full'
                }`}
              style={{ width: '420px' }}
            >
              <div className="h-full overflow-y-auto px-6 py-4">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Sample Queries</h3>
                  <p className="text-xs text-gray-500">Click any query to use it</p>
                </div>
                <div className="space-y-3">
                  {APP_CONFIG.sampleQueries.map((category, idx) => (
                    <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      {/* Category Header - Clickable */}
                      <button
                        onClick={() => toggleCategory(idx)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-left flex-1">
                            <h4 className="text-sm font-semibold text-gray-800">{category.category}</h4>
                            {category.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${expandedCategories[idx] ? 'transform rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Queries - Collapsible */}
                      {expandedCategories[idx] && (
                        <div className="px-4 pb-4 pt-0 space-y-1.5 border-t border-gray-100">
                          {category.queries.map((query, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => {
                                setInputValue(query);
                                inputRef.current?.focus();
                              }}
                              className="w-full text-left text-xs text-gray-700 hover:text-brand hover:bg-brand/10 rounded-md px-3 py-2 transition-all border border-transparent hover:border-brand/20"
                              disabled={isLoading}
                            >
                              {query}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CommandCenter;
