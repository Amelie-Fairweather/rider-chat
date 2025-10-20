"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

export default function ChatHeader({ user }: { user: User | undefined }) {
  const router = useRouter();
  const [onlineCount, setOnlineCount] = useState(1);
  const [clientId] = useState(() => Math.random().toString(36).slice(2));
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationField, setShowVerificationField] = useState(false);

  useEffect(() => {
    const channel = supabaseBrowser.channel('online-users');
    const onlineClients = new Set<string>();
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

  
  const handleLogin = () => {
    setShowLoginPopup(true);
  };

  const handleSendEmail = async () => {
    const supabase = supabaseBrowser;
    
    await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
      },
    });
    
    setShowVerificationField(true);
  };

  const handleVerifyCode = async () => {
    const supabase = supabaseBrowser;
    
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: verificationCode,
      type: 'email'
    });
    
    if (!error) {
      setShowLoginPopup(false);
      setEmail("");
      setVerificationCode("");
      setShowVerificationField(false);
      router.refresh();
    }
  };

  const handleLogout = async () => {
    const supabase = supabaseBrowser;
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <>
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
              onClick={handleLogin}
              className="bg-pink-300 text-white px-4 py-2 rounded hover:bg-pink-400"
            >
              LogIn
            </button>
          )}
        </div>
      </div>

      {/* Pink Login Popup */}
      {showLoginPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-pink-300 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              Hi! Please enter an email in the text box below to verify!
            </h2>
            
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded border border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              
              <button
                onClick={handleSendEmail}
                className="w-full bg-white text-pink-300 px-4 py-2 rounded hover:bg-pink-100 font-semibold"
              >
                Send
              </button>
              
              {showVerificationField && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full p-3 rounded border border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  
                  <button
                    onClick={handleVerifyCode}
                    className="w-full bg-white text-pink-300 px-4 py-2 rounded hover:bg-pink-100 font-semibold"
                  >
                    Verify
                  </button>
                </div>
              )}
              
              <button
                onClick={() => {
                  setShowLoginPopup(false);
                  setEmail("");
                  setVerificationCode("");
                  setShowVerificationField(false);
                }}
                className="w-full bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

  