// /server/lib/groqClient.js
const Groq = require('groq-sdk')

let client = null

function getGroqClient() {
  if (client) return client
  
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY not set. Add it to your .env file.\n' +
      'Get a free key at: https://console.groq.com/keys'
    )
  }
  
  client = new Groq({ apiKey })
  console.log('[GROQ] Client initialized with key: ' + apiKey.slice(0, 12) + '...')
  return client
}

module.exports = { getGroqClient }
