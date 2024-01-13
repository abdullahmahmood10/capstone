const express= require('express')
const {engine} = require('express-handlebars')
app = express()
app.set('views', __dirname+"/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars',engine())
app.use("/static", express.static(__dirname + "/static"))
const bodyParser = require('body-parser')
const { CohereClient } = require("cohere-ai");
app.use(bodyParser.json())



app.get('/', (req,res) => {
    res.render('home', {layout: undefined})
})

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