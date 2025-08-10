// API Base URL (Worker proxy)
const API_BASE = '/api';

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Health checks
  async getHealth() {
    return this.request('/health');
  }

  async getMetrics() {
    return this.request('/metrics');
  }

  // Agent endpoints
  async createAgentSession() {
    return this.request('/agents/session', { method: 'POST' });
  }

  async sendAgentMessage(sessionId: string, role: string, content: string) {
    return this.request('/agents/message', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, role, content }),
    });
  }

  // SSE stream for agent responses
  createAgentStream(sessionId: string): EventSource {
    const url = `${API_BASE}/agents/stream?session_id=${sessionId}`;
    return new EventSource(url);
  }

  // System endpoints
  async getJobs() {
    return this.request('/jobs');
  }

  async createEvent(payload: any) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient();