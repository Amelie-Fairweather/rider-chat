"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

export default function ChatHeader({ user }: { user: User | undefined }) {
  const router = useRouter();
  const [onlineCount, setOnlineCount] = useState(1);
  const [clientId] = useState(() => Math.random().toString(36).slice(2));

  useEffect(() => {
    const channel = supabaseBrowser.channel('online-users');
    let onlineClients = new Set<string>();
    onlineClients.add(clientId);

    // Respond to "who_is_online" requests
    channel.on('broadcast', { event: 'who_is_online' }, ({ payload }) => {
      if (payload.clientId !== clientId) {
        channel.send({
          type: 'broadcast',
          event: 'here',
          payload: { clientId }
        });
      }
    });

    // Listen for "here" responses
    channel.on('broadcast', { event: 'here' }, ({ payload }) => {
      onlineClients.add(payload.clientId);
      setOnlineCount(onlineClients.size);
    });

    // Listen for join/leave as before
    channel.on('broadcast', { event: 'join' }, ({ payload }) => {
      onlineClients.add(payload.clientId);
      setOnlineCount(onlineClients.size);
    });

    channel.on('broadcast', { event: 'leave' }, ({ payload }) => {
      onlineClients.delete(payload.clientId);
      setOnlineCount(onlineClients.size);
    });

    // Subscribe and handshake
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Announce self
        channel.send({
          type: 'broadcast',
          event: 'join',
          payload: { clientId }
        });
        // Ask who else is online
        channel.send({
          type: 'broadcast',
          event: 'who_is_online',
          payload: { clientId }
        });
      }
    });

    const handleUnload = () => {
      channel.send({
        type: 'broadcast',
        event: 'leave',
        payload: { clientId }
      });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleUnload);
      supabaseBrowser.removeChannel(channel);
    };
  }, [clientId]);

  const handleLoginWithGithub = () => {
    const supabase = supabaseBrowser;
    supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + "/api/auth/callback"
      }
    });
  };

  const handleLogout = async () => {
    const supabase = supabaseBrowser;
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="h-20">
      <div className="p-5 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-pink-300">Daily Chat</h1>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 bg-pink-300 rounded-full animate-pulse"></div>
            <h1 className="text-sm text-gray-500">{onlineCount} online{onlineCount !== 1 && "s"}</h1>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 my-2"></div>
        </div>
        {user ? (
          <button
            onClick={handleLogout}
            className="bg-pink-300 text-white px-4 py-2 rounded hover:bg-pink-400"
          >
            LogOut
          </button>
        ) : (
          <button
            onClick={handleLoginWithGithub}
            className="bg-pink-300 text-white px-4 py-2 rounded hover:bg-pink-400"
          >
            LogIn
          </button>
        )}
      </div>
    </div>
  );
}

  