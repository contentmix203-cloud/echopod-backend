export const dynamic = 'force-dynamic'; // Add this line

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBriefingForUser } from '@/lib/generateBriefing';

// ... the rest of your code remains the same
export async function GET() {
    // ...
}