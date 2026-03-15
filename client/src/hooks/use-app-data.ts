import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { MOCK_CONVERSATIONS, MOCK_CONTACTS, MOCK_MESSAGES, MOCK_USERS } from '@/lib/mock-data';

export function useAppConversations(status?: string) {
  const params = status && status !== 'all' ? `?status=${status}` : '';
  const { data, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['conversations', status],
    queryFn: async () => {
      const res = await apiFetch(`/api/conversations${params}`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },
    retry: 1,
  });

  const [fallback, setFallback] = useState(MOCK_CONVERSATIONS);

  useEffect(() => {
    if (error) {
      let filtered = MOCK_CONVERSATIONS;
      if (status && status !== 'all') {
        filtered = MOCK_CONVERSATIONS.filter((c: any) => c.status === status);
      }
      setFallback(filtered);
    }
  }, [error, status]);

  return {
    conversations: error ? fallback : (data || []),
    isLoading: isLoading && !error,
    isMock: !!error,
    refetch,
  };
}

export function useAppContacts(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data, isLoading, error, refetch } = useQuery<{ contacts: any[]; total: number }>({
    queryKey: ['contacts', search],
    queryFn: async () => {
      const res = await apiFetch(`/api/contacts${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    retry: 1,
  });

  return {
    contacts: error ? MOCK_CONTACTS : (data?.contacts || []),
    total: error ? MOCK_CONTACTS.length : (data?.total || 0),
    isLoading: isLoading && !error,
    isMock: !!error,
    refetch,
  };
}

export function useAppMessages(conversationId: number) {
  const { data, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await apiFetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!conversationId,
    retry: 1,
  });

  return {
    messages: error ? (MOCK_MESSAGES[conversationId as keyof typeof MOCK_MESSAGES] || []) : (data || []),
    isLoading: isLoading && !error,
    isMock: !!error,
    refetch,
  };
}

export function useAuth() {
  const storedUser = localStorage.getItem('chatflow_user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const token = localStorage.getItem('chatflow_token');

  return {
    user: parsedUser || MOCK_USERS[0],
    isAuthenticated: !!token,
    logout: () => {
      localStorage.removeItem('chatflow_token');
      localStorage.removeItem('chatflow_user');
      window.location.href = '/login';
    }
  };
}
