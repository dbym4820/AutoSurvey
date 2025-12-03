import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from './api';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 認証状態をチェック
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await api.auth.me();
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch (error) {
        // 未認証の場合はエラーになるが、正常
        console.log('Not authenticated');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  // ログイン済み
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
