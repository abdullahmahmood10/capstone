const express = require('express');
const app = express();
const business = require('./business')
const cors = require('cors');
const bodyParser = require('body-parser')
require('dotenv').config({ path: './environment.env' }); // Load environment variables from .env file
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const fs = require("fs/promises");
app.use(bodyParser.json());
app.use(cors());







app.post('/api/login', async (req, res) => {
  let { username, password } = req.body;
  console.log(username) 
  console.log(password)
  try {
    // Validate user credentials
    let accountType = await business.validateCredentials(username, password);

    if (accountType) {
      // If credentials are valid, start a session and return session details
      let sessionData = await business.startSession(username);
      
      res.cookie('sessionkey', sessionData.sessionKey)

      res.status(200).json({
        status: true,
        message: 'Login successful',
        accountType,
        expiry: sessionData['expiry']
      });
    } else {
      res.status(401).json({
        status: false,
        message: 'Login failed. Invalid credentials.'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: 'Internal server error.'
    });
  }
});

app.post('/api/ask', async (req, res) => {
  const userQuery = req.body.query;
  const messages = [
    { role: "system", content: `You are an Academic Advisor in the University of Doha for Science and Technology (UDST). 
    You will help in calculating the GPA of the students.` },
    { role: "assistant", content: `The formula for calculating the GPA is: 
    (Credits * Grades)/Credits. 
    If a student asks for calculating their GPA, please ask from them the grades and credit for each course. The grading criteria is:
    A   =     4
    B+ =     3.5
    B   =     3
    C+  =   2.5
    C   =   2
    D+  =   1.5
    D    =    1
    F    =   0 `},
    { role: "user", content: `${userQuery}` },
  ];
  const client = new OpenAIClient(process.env.OPENAI_ENDPOINT, new AzureKeyCredential(process.env.OPENAI_API_KEY));
  const deploymentId = process.env.OPENAI_MODEL_NAME;
  const result = await client.getChatCompletions(deploymentId, messages);
  for (const choice of result.choices) {
    res.json({ llm_response: choice.message.content });
  }
  
})

app.get('/api/speech', async(req,res)=>{
  const client = new OpenAIClient(process.env.SPEECH_ENDPOINT, new AzureKeyCredential(process.env.SPEECH_API_KEY));
  const deploymentName = process.env.OPENAI_MODEL_NAME;
  const audio = await fs.readFile("");//Add the speech audio file here.
  const result = await client.getAudioTranscription(deploymentName, audio,{ language: 'en' });

  console.log(result.text);
})


app.listen(8000, async() => {
    console.log("Application started")
})

