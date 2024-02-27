const express = require('express');
const app = express();
const business = require('./business')
const cors = require('cors');
const bodyParser = require('body-parser')
require('dotenv').config({ path: './environment.env' }); // Load environment variables from .env file
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const fs = require("fs/promises");
const fileType = import('file-type');

app.use(bodyParser.json());
app.use(cors());


app.post('/api/login', async (req, res) => {
  let { username, password } = req.body;
  console.log(username) 
  console.log(password)
  try {
    // Validate user credentials
    let jwtToken = await business.validateCredentials(username, password);

    if (jwtToken) {
      res.status(200).json({status: true, message: 'Login successful', jwtToken});
    } else {
      res.status(401).json({status: false, message: 'Login failed. Invalid credentials.'});
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({status: false, message: 'Internal server error.'});
  }
});

app.post('/api/update-or-verify-token', async (req, res) => {
  console.log(req.body.token)
  let verifiedToken = await business.verifyToken(req.body.token);
  console.log(verifiedToken) 

  try {
    if (verifiedToken) {
      let convoToken = await business.generateToken(verifiedToken)
      console.log(convoToken)
      res.status(200).json({status: true, message: 'verification successful', convoToken});
    } else {
      res.status(401).json({status: false, message: 'verification failed. Invalid login token.'});
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({status: false, message: 'Internal server error.'});
  }
});

app.post('/api/ask', async (req, res) => {
  let userQuery = ""
  let convoToken = await business.verifyToken(req.body.token)

  if (req.body.file) {
    // If a file is provided, handle it (voice note, image, etc.)
    let buffer = Buffer.from(req.body.file, 'base64');
    let fileTypeResult = fileType(buffer);

    if (fileTypeResult) {
      const mime = fileTypeResult.mime;

      if (mime.startsWith('audio')) {
        userQuery = await speechToText(buffer);
      } else if (mime.startsWith('image')) {
        userQuery = await imageToText(buffer);
      } else {
        // Unsupported file type
        userQuery = req.body.message;
      }
    } 
  } else {
    // Unable to determine file type
    userQuery = req.body.message;
  }

  await business.saveChatHistory(convoToken.username, 'user', userQuery);

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
    const llmResponse = choice.message.content;
    await business.saveChatHistory(convoToken.username, 'LLM', llmResponse);
    res.json({ llm_response: llmResponse });
  } 
})

app.post('/api/end-convo', async (req, res) => {
  let verifiedToken = await business.verifyToken(req.body.token)

  try {
    if (verifiedToken) {
      await business.endConversation(verifiedToken.username);
      res.status(200).json({ status: true, message: 'Conversation ended successfully.' });
    } else {
      res.status(401).json({status: false, message: 'verification failed. Invalid login token.'});
    }
  } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Internal server error.' });
  }
});

async function textToText() {

}

async function speechToText(){
  const client = new OpenAIClient(process.env.SPEECH_ENDPOINT, new AzureKeyCredential(process.env.SPEECH_API_KEY));
  const deploymentName = process.env.OPENAI_MODEL_NAME;
  const audio = await fs.readFile("");//Add the speech audio file here.
  const result = await client.getAudioTranscription(deploymentName, audio,{ language: 'en' });
  if (result){
    return result.text
  }
  return undefined
}

async function imageToText(){
 
}

app.get('/api/speech', async (req,res) => {
  console.log('iski zaroorath nai')
})


app.listen(8000, async() => {
    console.log("Application started")
})

