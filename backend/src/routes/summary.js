const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

router.get('/', async (req, res) => {
  try {
    // 1. Fetch active tickets from Supabase
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Summary API] Supabase error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!tickets || tickets.length === 0) {
      return res.json({ summary: 'There are currently no open or active complaints in the system. The city is running smoothly.' });
    }

    // 2. Prepare data for Bedrock
    const ticketData = tickets.map(t => 
      `- [${t.department}] ${t.issue_type} at ${t.location} (Urgency: ${t.urgency}, Sentiment: ${t.sentiment}, Source: ${t.source})`
    ).join('\n');

    const systemPrompt = `You are a Chief Operations AI for a city.
Review the list of active citizen complaints and provide a highly professional, 2-to-3 sentence executive situational summary for the city officers.
Focus on clusters of issues, high-urgency emergencies, and overarching themes. Do not list every single ticket. Keep it extremely concise and actionable.`;

    const userPrompt = `Active Tickets:\n${ticketData}`;

    // 3. Call Amazon Bedrock Llama model
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const modelId = process.env.AWS_BEDROCK_MODEL_ID || 'us.meta.llama3-1-8b-instruct-v1:0';

    const command = new ConverseCommand({
      modelId: modelId,
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: 'user',
          content: [{ text: userPrompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 512,
        temperature: 0.5,
      },
    });

    const response = await client.send(command);
    const summaryText = response.output.message.content[0].text;

    res.json({ summary: summaryText });
  } catch (err) {
    console.error('[Summary API] Error generating summary:', err);
    res.status(500).json({ error: 'Failed to generate AI summary' });
  }
});

module.exports = router;
