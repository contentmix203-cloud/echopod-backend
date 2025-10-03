// lib/generateBriefing.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateBriefingForUser(userId: string) {
    console.log(`Starting briefing generation for user: ${userId}`);
    const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('topic_name')
        .eq('user_id', userId);
    if (topicsError || !topics || topics.length === 0) {
        console.error('Error fetching topics or no topics found for user:', userId, topicsError);
        return;
    }
    const topicNames = topics.map(t => t.topic_name).join(', ');
    const scriptPrompt = `
        You are "EchoPod", a friendly and energetic AI radio host.
        Create a short, engaging daily briefing script, about 250 words long.
        The user is interested in these topics: ${topicNames}.
        Cover 2-3 of these topics. Start with a warm welcome and end with a positive sign-off.
        Do not use formatting like headings or bullet points. Just write a single block of text.
    `;
    const scriptResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: scriptPrompt }],
        max_tokens: 400,
    });
    const script = scriptResponse.choices[0].message.content;
    if (!script) { throw new Error('Failed to generate script.'); }

    const audioResponse = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: script,
    });
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const audioFileName = `briefing_${userId}_${new Date().toISOString()}.mp3`;
    const { error: uploadError } = await supabase.storage
        .from('briefings')
        .upload(audioFileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) { throw new Error(`Error uploading audio file: ${uploadError.message}`); }

    const { data: { publicUrl } } = supabase.storage.from('briefings').getPublicUrl(audioFileName);
    const { error: insertError } = await supabase.from('briefings').insert({
        user_id: userId,
        title: `Your Daily Briefing for ${new Date().toLocaleDateString()}`,
        script: script,
        audio_url: publicUrl,
    });
    if (insertError) { throw new Error(`Error saving briefing to database: ${insertError.message}`); }
    console.log(`Briefing for user ${userId} completed successfully!`);
}