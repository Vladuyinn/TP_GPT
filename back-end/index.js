const express = require('express');
const cors = require('cors');
const Conversation = require('./models/conversation.model');
require("dotenv").config();
require("./database"); // Assure-toi que la connexion MongoDB est bien lancée

const app = express();
app.use(express.json());
app.use(cors());

async function queryModelWithFetch(inputText) {
    const MODEL_NAME = "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";

    try {
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${MODEL_NAME}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: inputText,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// Endpoint pour envoyer un message à une conversation spécifique
app.post('/chat/:id', async (req, res) => {
  try {
      const conversation = await Conversation.findById(req.params.id);
      if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
      }

      const userMessage = req.body.message;
      conversation.messages.push({ sender: "User", message: userMessage });

      // Appel de l'IA via Hugging Face
      const aiResponse = await queryModelWithFetch(userMessage);
      let botMessage = aiResponse?.[0]?.generated_text || "Pas de réponse de l'IA.";
      
      // Filtrer la réponse pour ne garder que ce qui est après `</think>`
      const thinkTag = "</think>";
      const thinkIndex = botMessage.indexOf(thinkTag);
      if (thinkIndex !== -1) {
          botMessage = botMessage.substring(thinkIndex + thinkTag.length).trim();
      }

      conversation.messages.push({ sender: "JunoPT", message: botMessage });

      await conversation.save();
      res.json({ messages: conversation.messages });
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint pour récupérer toutes les conversations
app.get('/conversations', async (req, res) => {
  try {
      const conversations = await Conversation.find({}, { messages: 1 });
      res.json(conversations);
  } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint pour récupérer une conversation spécifique
app.get('/conversation/:id', async (req, res) => {
  try {
      const conversation = await Conversation.findById(req.params.id);
      res.json(conversation);
  } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint pour démarrer une nouvelle conversation
app.post('/new-conversation', async (req, res) => {
  try {
      const newConversation = new Conversation({ messages: [] });
      await newConversation.save();
      res.json({ conversationId: newConversation._id });
  } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint pour supprimer une conversation par ID
app.delete('/conversation/:id', async (req, res) => {
  try {
      await Conversation.findByIdAndDelete(req.params.id);
      res.json({ message: "Conversation supprimée avec succès" });
  } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
