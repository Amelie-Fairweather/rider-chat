import { createBrowserClient } from "@supabase/ssr";    

type Database = any;

export const supabaseBrowser = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)