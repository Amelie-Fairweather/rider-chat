'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { Tables } from '@/lib/types/supabase';

const PAGE_SIZE = 20;

type Message = Tables<'messages'> & {
  users?: {
    display_name: string | null;
  };
};

interface ListMessagesProps {
  roomName?: string;
}

export default function ListMessages({ roomName }: ListMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch the latest messages (for initial load)
  const fetchLatestMessages = async () => {
    setLoading(true);
    let query = supabaseBrowser
      .from('messages')
      .select(`
      *,
      users!messages_send_by_fkey(display_name)
    `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    
    // Filter by room if roomName is provided
    if (roomName) {
      query = query.eq('room_name', roomName);
    } else {
      // If no room specified, only show messages without a room (null)
      query = query.is('room_name', null);
    }
    
    const { data, error } = await query;
    setLoading(false);
    if (error) return;
    // Reverse so newest is at the bottom
    setMessages((data || []).reverse());
    setHasMore((data?.length || 0) === PAGE_SIZE);
  };

  // Fetch older messages (for pagination)
  const fetchOlderMessages = async () => {
    if (!messages.length) return;
    setLoading(true);
    const oldest = messages[0].created_at;
    let query = supabaseBrowser
      .from('messages')
      .select(`
      *,
      users!messages_send_by_fkey(display_name)
    `)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    
    // Filter by room if roomName is provided
    if (roomName) {
      query = query.eq('room_name', roomName);
    } else {
      // If no room specified, only show messages without a room (null)
      query = query.is('room_name', null);
    }
    
    const { data, error } = await query;
    setLoading(false);
    if (error) return;
    // Prepend older messages (reverse to keep order)
    setMessages((prev) => [...(data || []).reverse(), ...prev]);
    setHasMore((data?.length || 0) === PAGE_SIZE);
  };

  // Initial fetch and realtime
  useEffect(() => {
    fetchLatestMessages();
    // Real-time subscription
    const channel = supabaseBrowser
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          // Only refetch if the message is for the current room
          const messageRoom = (payload.new as any)?.room_name || (payload.old as any)?.room_name;
          if (roomName) {
            if (messageRoom === roomName) {
              fetchLatestMessages();
            }
          } else {
            if (messageRoom === null) {
              fetchLatestMessages();
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [roomName]);

  const handleDelete = async (id: string) => {
    const { error } = await supabaseBrowser.from('messages').delete().eq('id', id);
    if (error) {
      alert('Failed to delete message: ' + error.message);
    }
    // The realtime subscription will auto-update the UI
  };

  const handleEdit = async (id: string, oldText: string) => {
    const newText = prompt('Edit your message:', oldText);
    if (newText !== null && newText.trim() !== '' && newText !== oldText) {
      const { error } = await supabaseBrowser.from('messages').update({ text: newText, is_edit: true }).eq('id', id);
      if (error) {
        alert('Failed to edit message: ' + error.message);
      }
      // The realtime subscription will auto-update the UI
    }
  };

  return (
    <div className="space-y-7">
      {roomName && (
        <div className="text-center py-2">
          <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
            Room: {roomName}
          </span>
        </div>
      )}
      {hasMore && (
        <div className="flex justify-center mb-2">
          <button
            onClick={fetchOlderMessages}
            disabled={loading}
            className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
      {messages.map((msg) => (
        <div className="bg-white dark:bg-[#18181b] flex items-center gap-2 p-3 rounded-lg mb-4 relative" key={msg.id}>
          <div className="w-10 h-10 bg-pink-200 rounded-full"></div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-sm">{msg.users?.display_name || 'User'}</h1>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(msg.created_at).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-black dark:text-white">{msg.text}</p>
          </div>
          {/* Action button */}
          <div className="relative">
            <button
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200"
              onClick={() => setOpenMenu(openMenu === msg.id ? null : msg.id)}
              aria-label="Actions"
            >
              <span className="text-xl">&#8942;</span>
            </button>
            {openMenu === msg.id && (
              <div className="absolute right-0 mt-2 w-24 bg-white border rounded shadow z-10">
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => { setOpenMenu(null); handleEdit(msg.id, msg.text); }}
                >
                  Edit
                </button>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                  onClick={() => { setOpenMenu(null); handleDelete(msg.id); }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
