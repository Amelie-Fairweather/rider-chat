'use client'
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import React from 'react'
import { toast } from 'sonner';

interface ChatInputProps {
  roomName?: string;
}

export default function ChatInput({ roomName }: ChatInputProps) {
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    setLoading(true);
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (!user) {
      alert("Not logged in!");
      setLoading(false);
      return;
    }
    const { error } = await supabaseBrowser
      .from("messages")
      .insert([{ 
        text, 
        send_by: user.id,
        room_name: roomName || null
      }]);
    setLoading(false);
    if (error) {
      toast.message(error.message);
    }
  };

  return (
    <div className="p-5">
      <input
        placeholder="send message"
        className="w-full border rounded-md p-2"
        disabled={loading}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
            const value = e.currentTarget.value;
            e.currentTarget.value = "";
            await handleSendMessage(value);
          }
        }}
      />
    </div>
  );
}

