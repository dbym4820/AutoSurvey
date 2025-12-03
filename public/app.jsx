import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, BookOpen, Calendar, ExternalLink, Sparkles, Filter, ChevronDown, ChevronUp, Loader2, LogIn, LogOut, Settings, User, AlertCircle } from 'lucide-react';

const API_BASE = '/api';

// =====================================================
// 認証コンテキスト
// =====================================================
const AuthContext = React.createContext(null);

function useAuth() {
  return React.useContext(AuthContext);
}

// =====================================================
// ログインフォーム
// =====================================================
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ログインに失敗しました');
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <BookOpen className="w-10 h-10 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">学術論文RSSリーダー</h1>
            <p className="text-sm text-gray-500">ログインしてください</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// メインアプリケーション
// =====================================================
function MainApp({ user, onLogout }) {
  const [papers, setPapers] = useState([]);
  const [journals, setJournals] = useState([]);
  const [selectedJournals, setSelectedJournals] = useState([]);
  const [dateFilter, setDateFilter] = useState('month');
  const [summaries, setSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState({});
  const [expandedPaper, setExpandedPaper] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showJournalFilter, setShowJournalFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [aiProviders, setAiProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');

  const dateOptions = [
    { value: 'week', label: '過去7日' },
    { value: 'month', label: '過去30日' },
    { value: 'all', label: 'すべて' },
  ];

  // 日付範囲を計算
  const getDateRange = useCallback(() => {
    const now = new Date();
    let dateFrom = null;
    
    switch (dateFilter) {
      case 'week':
        dateFrom = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        dateFrom = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
    }
    
    return { dateFrom };
  }, [dateFilter]);

  // 論文誌一覧を取得
  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch(`${API_BASE}/journals`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setJournals(data.journals);
          setSelectedJournals(data.journals.map(j => j.id));
        }
      } catch (error) {
        console.error('Failed to fetch journals:', error);
      }
    }
    fetchJournals();
  }, []);

  // AIプロバイダ一覧を取得
  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await fetch(`${API_BASE}/summaries/providers`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setAiProviders(data.providers);
          setSelectedProvider(data.current);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    }
    fetchProviders();
  }, []);

  // 論文を取得
  useEffect(() => {
    async function fetchPapers() {
      setLoading(true);
      try {
        const { dateFrom } = getDateRange();
        const params = new URLSearchParams();
        if (selectedJournals.length > 0) {
          params.set('journals', selectedJournals.join(','));
        }
        if (dateFrom) {
          params.set('dateFrom', dateFrom);
        }
        params.set('limit', '100');

        const res = await fetch(`${API_BASE}/papers?${params}`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success) {
          setPapers(data.papers);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error('Failed to fetch papers:', error);
      } finally {
        setLoading(false);
      }
    }

    if (selectedJournals.length > 0) {
      fetchPapers();
    } else {
      setPapers([]);
    }
  }, [selectedJournals, dateFilter, getDateRange]);

  // 論文誌の選択を切り替え
  const toggleJournal = (journalId) => {
    setSelectedJournals(prev =>
      prev.includes(journalId)
        ? prev.filter(id => id !== journalId)
        : [...prev, journalId]
    );
  };

  // AI要約を生成
  const generateSummary = async (paper) => {
    setLoadingSummary(prev => ({ ...prev, [paper.id]: true }));

    try {
      const res = await fetch(`${API_BASE}/summaries/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paperId: paper.id,
          provider: selectedProvider,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSummaries(prev => ({ ...prev, [paper.id]: data.summary }));
        setExpandedPaper(paper.id);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Summary generation failed:', error);
      alert('要約の生成に失敗しました: ' + error.message);
    } finally {
      setLoadingSummary(prev => ({ ...prev, [paper.id]: false }));
    }
  };

  // 手動フェッチ
  const handleManualFetch = async () => {
    if (!user.isAdmin) return;
    
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/admin/scheduler/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`取得完了: ${data.result.newPapers}件の新規論文`);
        window.location.reload();
      }
    } catch (error) {
      console.error('Manual fetch failed:', error);
      alert('取得に失敗しました');
    } finally {
      setIsRefreshing(false);
    }
  };

  // ログアウト
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">学術論文RSSリーダー</h1>
                <p className="text-sm text-gray-500">AI in Education / Cognitive Science / Metacognition</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {user.isAdmin && (
                <button
                  onClick={handleManualFetch}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? '取得中...' : 'フィード取得'}
                </button>
              )}
              
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{user.username}</span>
                {user.isAdmin && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">管理者</span>}
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="ログアウト"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* フィルター */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* 論文誌フィルター */}
            <div className="relative">
              <button
                onClick={() => setShowJournalFilter(!showJournalFilter)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>論文誌 ({selectedJournals.length}/{journals.length})</span>
                {showJournalFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showJournalFilter && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-20">
                  {journals.map(journal => (
                    <label key={journal.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedJournals.includes(journal.id)}
                        onChange={() => toggleJournal(journal.id)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className={`w-2 h-2 rounded-full ${journal.color}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{journal.name}</div>
                        <div className="text-xs text-gray-500">{journal.category}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 日付フィルター */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {dateOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* AIプロバイダ選択 */}
            {aiProviders.length > 0 && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {aiProviders.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-sm text-gray-600">
              {pagination.total}件の論文
            </div>
          </div>
        </div>

        {/* 論文リスト */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {papers.map(paper => {
              const isExpanded = expandedPaper === paper.id;
              const summary = summaries[paper.id];
              const isLoadingSummary = loadingSummary[paper.id];

              return (
                <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-1 self-stretch rounded-full ${paper.journal_color}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${paper.journal_color}`}>
                            {paper.journal_name}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(paper.published_date)}</span>
                          {paper.has_summary > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">要約済</span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{paper.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                        </p>
                        <p className="text-sm text-gray-700 mb-4 line-clamp-3">{paper.abstract}</p>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => generateSummary(paper)}
                            disabled={isLoadingSummary}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50"
                          >
                            {isLoadingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {isLoadingSummary ? '生成中...' : 'AI要約'}
                          </button>

                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600"
                          >
                            <ExternalLink className="w-4 h-4" />
                            論文を開く
                          </a>

                          {summary && (
                            <button
                              onClick={() => setExpandedPaper(isExpanded ? null : paper.id)}
                              className="flex items-center gap-1 text-sm text-indigo-600"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {isExpanded ? '閉じる' : '要約を表示'}
                            </button>
                          )}
                        </div>

                        {summary && isExpanded && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              <span className="text-sm font-medium text-indigo-900">
                                AI要約 ({summary.ai_provider} / {summary.ai_model})
                              </span>
                            </div>
                            <div className="space-y-3 text-sm text-gray-800">
                              {summary.purpose && (
                                <div>
                                  <span className="font-medium text-indigo-700">【研究目的】</span>
                                  <p>{summary.purpose}</p>
                                </div>
                              )}
                              {summary.methodology && (
                                <div>
                                  <span className="font-medium text-indigo-700">【手法】</span>
                                  <p>{summary.methodology}</p>
                                </div>
                              )}
                              {summary.findings && (
                                <div>
                                  <span className="font-medium text-indigo-700">【主な発見】</span>
                                  <p>{summary.findings}</p>
                                </div>
                              )}
                              {summary.implications && (
                                <div>
                                  <span className="font-medium text-indigo-700">【教育への示唆】</span>
                                  <p>{summary.implications}</p>
                                </div>
                              )}
                              {!summary.purpose && summary.summary_text && (
                                <p className="whitespace-pre-wrap">{summary.summary_text}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && papers.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">条件に一致する論文がありません</p>
          </div>
        )}
      </main>
    </div>
  );
}

// =====================================================
// ルートコンポーネント
// =====================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初期認証チェック
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  return (
    <AuthContext.Provider value={user}>
      <MainApp user={user} onLogout={() => setUser(null)} />
    </AuthContext.Provider>
  );
}
