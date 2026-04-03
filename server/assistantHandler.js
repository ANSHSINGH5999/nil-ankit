const OPENAI_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const MAX_HISTORY_MESSAGES = 8;

function buildTranscript(messages) {
  return messages
    .map((message) => {
      const speaker = message.role === 'assistant' ? 'Assistant' : 'User';
      return `${speaker}: ${message.content}`;
    })
    .join('\n');
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return '';
  }

  return data.output
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

export async function generateAssistantReply({
  messages = [],
  route = '/',
  userName = '',
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured on the server.');
    error.status = 500;
    throw error;
  }

  const normalizedMessages = messages
    .filter((message) => message && typeof message.content === 'string')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content.trim(),
    }))
    .filter((message) => message.content);

  if (normalizedMessages.length === 0) {
    const error = new Error('At least one user message is required.');
    error.status = 400;
    throw error;
  }

  const instructions = [
    'You are SkillSync AI, an in-product assistant for a skill-sharing platform.',
    'Be concise, practical, and friendly.',
    'Help users navigate the app, improve profiles, brainstorm learning plans, and understand skill exchange features.',
    `The user is currently on route: ${route}.`,
    userName ? `The signed-in user is: ${userName}.` : 'The signed-in user is unknown.',
  ].join(' ');

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      instructions,
      input: buildTranscript(normalizedMessages),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      data?.error?.message || 'OpenAI request failed. Check server logs for details.';
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const reply = extractOutputText(data);

  if (!reply) {
    const error = new Error('OpenAI returned an empty response.');
    error.status = 502;
    throw error;
  }

  return reply;
}
