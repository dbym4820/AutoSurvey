// ベースパス（Viteのimport.meta.envから取得、またはデフォルト）
const BASE_PATH = import.meta.env.BASE_URL || '/autosurvey/';
const API_BASE = `${BASE_PATH}api`.replace(/\/+/g, '/').replace(/\/$/, '');

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'APIエラーが発生しました', response.status, data);
  }

  return data;
}

export const api = {
  // 認証
  auth: {
    login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
  },

  // 論文誌
  journals: {
    list: (all = false) => request(`/journals${all ? '?all=true' : ''}`),
    create: (data) => request('/admin/journals', { method: 'POST', body: data }),
    update: (id, data) => request(`/admin/journals/${id}`, { method: 'PUT', body: data }),
    delete: (id, permanent = false) => request(`/admin/journals/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),
    activate: (id) => request(`/admin/journals/${id}/activate`, { method: 'POST' }),
    testRss: (rssUrl) => request('/admin/journals/test-rss', { method: 'POST', body: { rssUrl } }),
    fetch: (id) => request(`/admin/journals/${id}/fetch`),
  },

  // 論文
  papers: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.journals) query.set('journals', params.journals.join(','));
      if (params.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params.dateTo) query.set('dateTo', params.dateTo);
      if (params.search) query.set('search', params.search);
      if (params.limit) query.set('limit', params.limit);
      if (params.offset) query.set('offset', params.offset);
      return request(`/papers?${query}`);
    },
  },

  // AI要約
  summaries: {
    providers: () => request('/summaries/providers'),
    generate: (paperId, provider) => request('/summaries/generate', { method: 'POST', body: { paperId, provider } }),
  },

  // 管理者
  admin: {
    runScheduler: () => request('/admin/scheduler/run', { method: 'POST' }),
    getLogs: (limit = 50) => request(`/admin/logs?limit=${limit}`),
  },
};

export default api;
