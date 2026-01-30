
import React, { useState, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Bookmark, 
  Search, 
  RefreshCcw, 
  ExternalLink, 
  Trash2, 
  Sparkles, 
  CheckCircle,
  Clock,
  Loader2,
  Bell,
  MoreVertical,
  X,
  AlertCircle,
  MessageSquare,
  Send,
  // Added missing User icon import
  User
} from 'lucide-react';
import { ContentItem, NavTab } from './types';
import { generateHooksForContent } from './services/geminiService';

// Declare mcp on window for TypeScript
declare global {
  interface Window {
    mcp?: {
      callTool: (server: string, tool: string, args: any) => Promise<any>;
    };
  }
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  loading = false,
  disabled = false 
}: { 
  children: React.ReactNode, 
  onClick?: () => void | Promise<void>, 
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger', 
  className?: string, 
  loading?: boolean,
  disabled?: boolean 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

const ContentCard = ({ 
  item, 
  onSaveToggle, 
  onConvert, 
  onDelete 
}: { 
  item: ContentItem, 
  onSaveToggle: (id: string) => void,
  onConvert?: (item: ContentItem) => void | Promise<void>,
  onDelete?: (id: string) => void
}) => {
  return (
    <div className="group bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-50 text-indigo-600`}>
            AI Response
          </span>
          <span className="text-gray-400 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {item.createdAt}
          </span>
        </div>
        <button 
          onClick={() => onSaveToggle(item.id)}
          className={`p-1.5 rounded-full transition-colors ${item.isSaved ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Bookmark className={`w-4 h-4 ${item.isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 leading-snug group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2">
        {item.title}
      </h3>
      <p className="text-gray-500 text-sm mb-4 leading-relaxed whitespace-pre-wrap">
        {item.excerpt}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Feedback Agent Output</span>
        
        <div className="flex gap-2">
          {onDelete && (
            <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onConvert && (
            <button 
              onClick={() => onConvert(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
            >
              <Sparkles className="w-3 h-3" />
              Generate Hooks
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      active 
        ? 'bg-indigo-50 text-indigo-700' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : ''}`} />
    {label}
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.FEED);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedItemForHooks, setSelectedItemForHooks] = useState<ContentItem | null>(null);
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);

  const toggleSave = useCallback((id: string) => {
    setContent(prev => prev.map(item => 
      item.id === id ? { ...item, isSaved: !item.isSaved } : item
    ));
  }, []);

  const handleAgentCall = async () => {
    if (!userMessage.trim()) {
      setNotification({ message: 'Please enter a message for the AI Agent.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    
    try {
      if (typeof window.mcp !== 'undefined') {
        console.log("Calling feedback_ai_agent via MCP...");
        
        const response = await window.mcp.callTool('n8n-mcp', 'feedback_ai_agent', { 
          message: userMessage 
        });

        if (response) {
          // Extract the data from response. n8n outputs can vary so we check standard fields.
          const textResponse = response.text || response.content || response.output || (typeof response === 'string' ? response : JSON.stringify(response));
          
          const newItem: ContentItem = {
            id: `agent-${Date.now()}`,
            source: 'newsletter', // Mapping to internal type for UI consistency
            title: userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage,
            excerpt: textResponse,
            url: '#',
            createdAt: 'Just now',
            isSaved: false
          };
          
          setContent(prev => [newItem, ...prev]);
          setUserMessage('');
          setNotification({ message: 'Feedback AI Agent responded successfully.', type: 'success' });
        } else {
          throw new Error("The AI Agent returned an empty response.");
        }
      } else {
        // Fallback simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockItem: ContentItem = {
          id: `sim-${Date.now()}`,
          source: 'newsletter',
          title: `Simulated: ${userMessage.substring(0, 30)}`,
          excerpt: `This is a simulated response to your message: "${userMessage}". In a live environment with n8n-mcp, the feedback_ai_agent would process this and return specific data.`,
          url: '#',
          createdAt: 'Just now',
          isSaved: false
        };
        setContent(prev => [mockItem, ...prev]);
        setUserMessage('');
        setNotification({ message: 'Response received (Simulation mode).', type: 'success' });
      }
    } catch (error: any) {
      console.error("Agent call failed:", error);
      setNotification({ 
        message: error.message || 'Connection to feedback_ai_agent failed. Verify n8n-mcp status.', 
        type: 'error' 
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleConvert = async (item: ContentItem) => {
    setSelectedItemForHooks(item);
    setIsGeneratingHooks(true);
    const hooks = await generateHooksForContent(item.title, item.excerpt);
    setGeneratedHooks(hooks);
    setIsGeneratingHooks(false);
  };

  const deleteSavedItem = (id: string) => {
    setContent(prev => prev.map(item => 
      item.id === id ? { ...item, isSaved: false } : item
    ));
  };

  const savedItems = content.filter(item => item.isSaved);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">ScrapeSense</h1>
          </div>

          <nav className="space-y-1">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Agent Feed" 
              active={activeTab === NavTab.FEED} 
              onClick={() => setActiveTab(NavTab.FEED)} 
            />
            <SidebarItem 
              icon={Bookmark} 
              label="Saved Responses" 
              active={activeTab === NavTab.SAVED} 
              onClick={() => setActiveTab(NavTab.SAVED)} 
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Alex Rivers</p>
              <p className="text-xs text-gray-500">MCP Dashboard</p>
            </div>
          </div>
          <SidebarItem icon={MoreVertical} label="Settings" active={false} onClick={() => {}} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {activeTab === NavTab.FEED ? 'Feedback AI Agent' : 'Saved Results'}
            </h2>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              MCP ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search history..." 
                className="pl-9 pr-4 py-1.5 bg-gray-50 border-transparent focus:bg-white focus:border-indigo-200 focus:ring-0 rounded-lg text-sm transition-all w-64 border"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scroll">
          <div className="max-w-4xl mx-auto">
            
            {activeTab === NavTab.FEED ? (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">Agent Command Center</h3>
                  <p className="text-gray-500">Type your message below to consult the Feedback AI Agent via n8n.</p>
                </div>

                {/* Agent Input Box */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-200">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        placeholder="Type any message for the Feedback AI Agent..."
                        className="w-full h-32 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none py-2 leading-relaxed"
                      />
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
                        <p className="text-xs text-gray-400">Press Cmd+Enter to send</p>
                        <Button 
                          onClick={handleAgentCall} 
                          loading={isProcessing}
                          className="px-8"
                          disabled={!userMessage.trim()}
                        >
                          {!isProcessing && <Send className="w-4 h-4 mr-2" />}
                          {isProcessing ? 'Consulting Agent...' : 'Send to Agent'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {content.length > 0 ? (
                    content.map(item => (
                      <ContentCard 
                        key={item.id} 
                        item={item} 
                        onSaveToggle={toggleSave} 
                      />
                    ))
                  ) : !isProcessing && (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-white/50">
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-indigo-200" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">No interaction history</h4>
                      <p className="text-gray-500 max-w-sm mx-auto mt-2">
                        Your agent responses will appear here after you send your first message.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">Saved Responses</h3>
                  <p className="text-gray-500">Curated collection of {savedItems.length} agent interactions.</p>
                </div>

                {savedItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedItems.map(item => (
                      <ContentCard 
                        key={item.id} 
                        item={item} 
                        onSaveToggle={toggleSave}
                        onConvert={handleConvert}
                        onDelete={deleteSavedItem}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Bookmark className="w-8 h-8 text-gray-300" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">No saved items</h4>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">
                      Responses you bookmark in the feed will appear here.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Hook Generation Modal */}
      {selectedItemForHooks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm transition-all">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">Response Analysis</h2>
              </div>
              <button onClick={() => setSelectedItemForHooks(null)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scroll">
              {isGeneratingHooks ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-gray-500 font-medium">Generating social media hooks from response...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedHooks.map((hook, index) => (
                    <div key={index} className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-all group relative">
                      <p className="text-gray-800 text-sm leading-relaxed pr-8">{hook}</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(hook);
                          setNotification({ message: 'Hook copied!', type: 'success' });
                          setTimeout(() => setNotification(null), 3000);
                        }}
                        className="absolute right-4 top-4 p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="pt-4">
                    <Button variant="secondary" className="w-full" onClick={() => setSelectedItemForHooks(null)}>Close</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl transition-all duration-500 transform ${notification ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'} ${notification?.type === 'error' ? 'bg-red-900 text-white' : 'bg-gray-900 text-white'}`}>
        {notification?.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
        <span className="text-sm font-medium">{notification?.message}</span>
      </div>
    </div>
  );
}
