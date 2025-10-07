import React from 'react';
import ChatHeader from "@/components/ui/ChatHeader";
import { supabaseServer } from '@/lib/supabase/server';
import InitUser from "@/lib/store/InitUser";
import ChatInput from "@/components/ui/ChatInput";
import ListMessages from "@/components/ui/ListMessages";

export default async function Page() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? undefined;

  return (
    <>
      <div className="max-w-3xl mx-auto md:py-10 h-screen">
        <div className="h-full border border-gray-200 dark:border-gray-700 rounded-md flex flex-col overflow-y-auto">
          <ChatHeader user={user} />
          <div className="flex-1 flex flex-col p-5 bg-white dark:bg-[#18181b]">
            <ListMessages />
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
          <div className="p-5 pt-0">
            <ChatInput />
          </div>
        </div>
      </div>
      <InitUser user={user} />
    </>
  );
}
 
