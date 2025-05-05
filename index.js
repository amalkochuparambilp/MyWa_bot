const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const axios = require('axios');
require('dotenv').config();
const fs = require('fs');

// Use creds.json for session
const { state, saveState } = useSingleFileAuthState('./creds.json');

async function connectBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  // Save session on changes
  sock.ev.on('creds.update', saveState);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (messageText) {
      console.log(`Received: ${messageText}`);
      const reply = await getGeminiResponse(messageText);
      await sock.sendMessage(sender, { text: reply });
    }
  });
}

async function getGeminiResponse(userInput) {
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{ parts: [{ text: userInput }] }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );
    return response.data.candidates[0]?.content?.parts[0]?.text || 'No response from Gemini.';
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    return 'Something went wrong with the AI.';
  }
}

connectBot();
