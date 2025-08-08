// API service layer for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
console.log("API_BASE_URL:", API_BASE_URL);

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
  title?: string;
  recurrence_id?: string;
  membership_id?: string;
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
  tutorial_checked: boolean;
  currency: string;
  created_at: string;
}

export interface StatsOverview {
  total_meetings: number;
  done_meetings: number;
  canceled_meetings: number;
  total_clients: number;
  total_revenue: number;
  total_hours: number;
  // Membership stats
  total_memberships: number;
  active_memberships: number;
  membership_revenue: number;
  membership_revenue_paid: number;
  clients_with_memberships: number;
  revenue_paid: number; // NEW: sum of price_total for meetings that are done and paid
}

// Recurrence types
export interface RecurrenceFrequency {
  weekly: 'WEEKLY';
  biweekly: 'BIWEEKLY';
  monthly: 'MONTHLY';
}

export interface RecurrenceUpdateScope {
  this_meeting_only: 'this_meeting_only';
  this_and_future: 'this_and_future';
  all_meetings: 'all_meetings';
}

export interface RecurrenceCreateRequest {
  service_id: string;
  client_id: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  start_date: string;
  end_date: string;
  title: string;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  price_per_hour: number;
  use_membership?: boolean; // Optional: whether to use active membership
}

export interface RecurrenceResponse {
  id: string;
  user_id: string;
  service_id: string;
  client_id: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  start_date: string;
  end_date: string;
  title: string;
  start_time: string;
  end_time: string;
  price_per_hour: number;
  created_at: string;
}

export interface RecurrenceLimitationInfo {
  total_possible_meetings: number;
  meetings_created: number;
  membership_name: string;
  available_meetings: number;
  total_meetings: number;
  completed_meetings: number;
  scheduled_meetings: number;
  message: string;
}

export interface RecurrenceCreateResponse {
  recurrence: RecurrenceResponse;
  meetings_created: number;
  membership_used: boolean;
  limitation_info?: RecurrenceLimitationInfo;
  message?: string;
}

export interface MeetingUpdateRequest {
  service_id?: string;
  client_id?: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  price_per_hour?: number;
  status?: 'upcoming' | 'done' | 'canceled';
  paid?: boolean;
  update_scope?: keyof RecurrenceUpdateScope;
}

export interface DailyBreakdownItem {
  date: string; // YYYY-MM-DD (UTC)
  revenue: number;
  meetings_count: number;
  meeting_ids: string[];
}

// Membership types
export interface Membership {
  id: string;
  user_id: string;
  service_id: string;
  client_id: string;
  name: string;
  total_meetings: number;
  price_per_membership: number;
  price_per_meeting: number;
  availability_days: number;
  status: 'active' | 'expired' | 'canceled';
  paid: boolean;
  start_date?: string;
  created_at: string;
}

export interface MembershipCreateRequest {
  service_id: string;
  client_id: string;
  name: string;
  total_meetings: number;
  price_per_membership: number;
  availability_days: number;
}

export interface MembershipUpdateRequest {
  name?: string;
  total_meetings?: number;
  price_per_membership?: number;
  availability_days?: number;
  status?: 'active' | 'expired' | 'canceled';
  paid?: boolean;
}

export interface MembershipProgress {
  membership_id: string;
  total_meetings: number;
  completed_meetings: number;
  remaining_meetings: number;
}

export interface ClientStats {
  client_id: string;
  client_name: string;
  total_meetings: number;
  done_meetings: number;
  canceled_meetings: number;
  total_revenue: number;
  total_hours: number;
  last_meeting?: string | null;
  price_per_hour?: number;
  price_per_meeting?: number;
}

export interface ClientStatsResponse {
  client_stats: ClientStats;
  meetings: Meeting[];
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_id?: string;
  related_entity_type?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationUpdateRequest {
  read?: boolean;
}

export interface NotificationMarkReadRequest {
  notification_ids: string[];
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
  async getMeetings(status?: 'upcoming' | 'done' | 'canceled', date?: string): Promise<Meeting[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    const queryString = params.toString();
    return this.request<Meeting[]>(`/meetings/${queryString ? `?${queryString}` : ''}`);
  }

  async getMeeting(id: string): Promise<Meeting> {
    return this.request<Meeting>(`/meetings/${id}`);
  }

  async createMeeting(data: {
    service_id: string;
    client_id: string;
    title?: string;
    recurrence_id?: string;
    membership_id?: string;
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

  async updateMeeting(
    id: string,
    data: MeetingUpdateRequest
  ): Promise<Meeting> {
    return this.request<Meeting>(`/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateRecurringMeeting(
    id: string,
    data: MeetingUpdateRequest,
    updateScope: 'this_meeting_only' | 'this_and_future' | 'all_meetings'
  ): Promise<Meeting[]> {
    return this.request<Meeting[]>(`/recurrences/meetings/${id}?update_scope=${updateScope}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMeeting(id: string, deleteScope?: string): Promise<void> {
    const params = deleteScope ? `?delete_scope=${deleteScope}` : '';
    await this.request(`/meetings/${id}${params}`, {
      method: 'DELETE',
    });
  }

  async deleteRecurringMeeting(
    id: string,
    deleteScope: 'this_meeting_only' | 'this_and_future' | 'all_meetings'
  ): Promise<void> {
    await this.request(`/recurrences/meetings/${id}?delete_scope=${deleteScope}`, {
      method: 'DELETE',
    });
  }

  // Recurrences API
  async createRecurrence(recurrence: RecurrenceCreateRequest): Promise<RecurrenceCreateResponse> {
    return this.request<RecurrenceCreateResponse>('/recurrences/', {
      method: 'POST',
      body: JSON.stringify(recurrence),
    });
  }

  async updateRecurrence(
    id: string,
    data: Partial<RecurrenceCreateRequest>
  ): Promise<RecurrenceResponse> {
    return this.request<RecurrenceResponse>(`/recurrences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRecurrence(id: string): Promise<void> {
    await this.request(`/recurrences/${id}`, {
      method: 'DELETE',
    });
  }

  async getRecurringMeetings(recurrenceId: string): Promise<Meeting[]> {
    return this.request<Meeting[]>(`/meetings/recurrence/${recurrenceId}`);
  }

  // Profile API
  async getProfile(): Promise<Profile> {
    return this.request<Profile>('/profile/');
  }

  async updateProfile(data: {
    name?: string;
    profile_picture_url?: string;
    tutorial_checked?: boolean;
    currency?: string;
  }): Promise<Profile> {
    return this.request<Profile>('/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Stats API
  async getStatsOverview(
    startDate?: string,
    endDate?: string,
    serviceId?: string
  ): Promise<StatsOverview> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (serviceId) params.append('service_id', serviceId);
    return this.request<StatsOverview>(`/stats/overview?${params}`);
  }

  async getClientStats(
    startDate?: string,
    endDate?: string,
    serviceId?: string
  ): Promise<ClientStatsResponse[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (serviceId) params.append('service_id', serviceId);
    return this.request<ClientStatsResponse[]>(`/stats/clients?${params}`);
  }

  async getDailyBreakdown(startDate: string, endDate: string, serviceId?: string): Promise<DailyBreakdownItem[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (serviceId) params.append('service_id', serviceId);
    return this.request<DailyBreakdownItem[]>(`/stats/daily_breakdown?${params}`);
  }

  async getSingleClientStats(
    clientId: string,
    startDate?: string,
    endDate?: string,
    serviceId?: string
  ): Promise<ClientStatsResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (serviceId) params.append('service_id', serviceId);
    return this.request<ClientStatsResponse>(`/stats/clients/${clientId}?${params}`);
  }

  // Memberships API
  async getMemberships(): Promise<Membership[]> {
    return this.request<Membership[]>('/memberships/');
  }

  async createMembership(data: MembershipCreateRequest): Promise<Membership> {
    return this.request<Membership>('/memberships/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMembership(id: string, data: MembershipUpdateRequest): Promise<Membership> {
    return this.request<Membership>(`/memberships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMembership(id: string): Promise<void> {
    await this.request(`/memberships/${id}`, {
      method: 'DELETE',
    });
  }

  async getActiveMembership(clientId: string): Promise<Membership | null> {
    return this.request<Membership | null>(`/memberships/active/${clientId}`);
  }

  async getMembershipMeetings(membershipId: string): Promise<Meeting[]> {
    return this.request<Meeting[]>(`/memberships/${membershipId}/meetings`);
  }

  async getMembershipProgress(membershipId: string): Promise<MembershipProgress> {
    return this.request<MembershipProgress>(`/memberships/${membershipId}/progress`);
  }

  // Notifications API
  async getNotifications(unreadOnly?: boolean): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unread_only', 'true');
    const queryString = params.toString();
    return this.request<Notification[]>(`/notifications/${queryString ? `?${queryString}` : ''}`);
  }

  async updateNotification(id: string, data: NotificationUpdateRequest): Promise<Notification> {
    return this.request<Notification>(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async markNotificationsRead(notificationIds: string[]): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
  }

  async deleteNotification(id: string): Promise<void> {
    await this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Function to update token from Supabase session
export const updateApiToken = (token: string | null) => {
  if (token) {
    apiClient.setToken(token);
  } else {
    apiClient.setToken('');
  }
};

// For development, set a dummy token
// This will be overridden by updateApiToken when user logs in
apiClient.setToken('dev-token');
