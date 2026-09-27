// Single source of truth for all Groq model IDs
// Updated: September 2026
// Verified against: GET https://api.groq.com/openai/v1/models

module.exports = {
  FAST: 'openai/gpt-oss-20b',      // Fast, low-latency chat
  BEST: 'openai/gpt-oss-120b'      // Highest quality reasoning
}
