"use client"

import React, { useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js';
import { useUser } from './user';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function InitUser({user}:{user:User|undefined}) {
    const initState= useRef(false)

    useEffect(()=>{
        if(!initState.current && user){
            useUser.setState({user}) 
            // Upsert user into users table
            supabaseBrowser
              .from("users")
              .upsert([
                {
                  id: user.id,
                  display_name: user.user_metadata?.full_name || user.email,
                  avatar_url: user.user_metadata?.avatar_url || "",
                },
              ])
              .then(({ error }) => {
                if (error) {
                  console.error("Failed to upsert user:", error);
                }
              });
        }
        initState.current = true 
    },[user]) 
  return <></>; 
}
  