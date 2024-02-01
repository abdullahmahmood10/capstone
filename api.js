const express = require('express');
const app = express();
const business = require('./business')

const test = ""

app.get('/api/data', (req, res) => {
  const data = {
    message: 'Hello from Node.js backend!'
  };
  test = data
});


app.post('/ask', async (req, res) => {
    const userQuery = req.body.query;


    const cohere = new CohereClient({
        token: "J47pJoOKMQ0rngZUJPTa4PTQZcuWbTkY7kjaJheT",
    });

    (async () => {
      const chatStream = await cohere.chatStream({
          chatHistory: [
              { role: "USER", message: "I am a student in UDST" },
              { role: "CHATBOT", message: "Hi, I am Genie your Academic Advisor. How can I help you?" }
          ],
          message: userQuery,
      });
      let response = ""
      for await (const message of chatStream) {
          if (message.eventType === "text-generation") {
              response +=message.text 
          }
      }
      res.json({ response: response });
    })();
  })

app.listen(8000, async() => {
    console.log("Application started")
})

