// API service layer for backend communication

const API_BASE_URL = 'http://localhost:8000';

// Types based on backend models
export interface Service {
  id: string;
  user_id: string;
  name: string;
  default_duration_minutes: number;
  default_price_per_hour: number;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  service_id: string;
  name: string;
  email: string;
  phone: string;
  custom_duration_minutes?: number;
  custom_price_per_hour?: number;
  created_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  service_id: string;
  client_id: string;
  recurrence_id?: string;
  start_time: string;
  end_time: string;
  price_per_hour: number;
  price_total: number;
  status: 'upcoming' | 'done' | 'canceled';
  paid: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  profile_picture_url?: string;
  created_at: string;
}

export interface StatsOverview {
  total_meetings: number;
  done_meetings: number;
  canceled_meetings: number;
  total_clients: number;
  total_revenue: number;
  total_hours: number;
}

// API client with authentication
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Services API
  async getServices(): Promise<Service[]> {
    return this.request<Service[]>('/services/');
  }

  async createService(data: {
    name: string;
    default_duration_minutes: number;
    default_price_per_hour: number;
  }): Promise<Service> {
    return this.request<Service>('/services/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: Partial<{
    name: string;
    default_duration_minutes: number;
    default_price_per_hour: number;
  }>): Promise<Service> {
    return this.request<Service>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string): Promise<void> {
    await this.request(`/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Clients API
  async getClients(serviceId?: string): Promise<Client[]> {
    const params = serviceId ? `?service_id=${serviceId}` : '';
    return this.request<Client[]>(`/clients/${params}`);
  }

  async createClient(data: {
    service_id: string;
    name: string;
    email: string;
    phone: string;
    custom_duration_minutes?: number;
    custom_price_per_hour?: number;
  }): Promise<Client> {
    return this.request<Client>('/clients/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: Partial<{
    service_id: string;
    name: string;
    email: string;
    phone: string;
    custom_duration_minutes: number;
    custom_price_per_hour: number;
  }>): Promise<Client> {
    return this.request<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string): Promise<void> {
    await this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Meetings API
  async getMeetings(status?: 'upcoming' | 'done' | 'canceled'): Promise<Meeting[]> {
    const params = status ? `?status=${status}` : '';
    return this.request<Meeting[]>(`/meetings/${params}`);
  }

  async createMeeting(data: {
    service_id: string;
    client_id: string;
    recurrence_id?: string;
    start_time: string;
    end_time: string;
    price_per_hour: number;
    status: 'upcoming' | 'done' | 'canceled';
    paid: boolean;
  }): Promise<Meeting> {
    return this.request<Meeting>('/meetings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMeeting(id: string, data: Partial<{
    service_id: string;
    client_id: string;
    recurrence_id: string;
    start_time: string;
    end_time: string;
    price_per_hour: number;
    status: 'upcoming' | 'done' | 'canceled';
    paid: boolean;
  }>): Promise<Meeting> {
    return this.request<Meeting>(`/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMeeting(id: string): Promise<void> {
    await this.request(`/meetings/${id}`, {
      method: 'DELETE',
    });
  }

  // Profile API
  async getProfile(): Promise<Profile> {
    return this.request<Profile>('/profile/');
  }

  async updateProfile(data: {
    name?: string;
    profile_picture_url?: string;
  }): Promise<Profile> {
    return this.request<Profile>('/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Stats API
  async getStatsOverview(period: string = 'last7days', serviceId?: string): Promise<StatsOverview> {
    const params = new URLSearchParams({ period });
    if (serviceId) params.append('service_id', serviceId);
    return this.request<StatsOverview>(`/stats/overview?${params}`);
  }
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// For development, set a mock token
apiClient.setToken('test-token');
