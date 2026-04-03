import { generateAssistantReply } from '../server/assistantHandler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const reply = await generateAssistantReply(req.body || {});
    res.status(200).json({ reply });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Unexpected error.' });
  }
}
