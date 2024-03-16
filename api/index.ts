const express = require('express');
const app = express();
const business = require('./business')
const cors = require('cors');
const bodyParser = require('body-parser')
require('dotenv').config({ path: './environment.env' }); // Load environment variables from .env file
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const fs = require("fs"); //changed

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; //added
const ffmpeg = require('fluent-ffmpeg'); //added

ffmpeg.setFfmpegPath(ffmpegPath);  //addedn


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
      res.status(200).json({ status: true, message: 'Login successful', jwtToken });
    } else {
      res.status(401).json({ status: false, message: 'Login failed. Invalid credentials.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Internal server error.' });
  }
});

app.post('/api/getUserdetails', async (req, res) => {
  let verifiedToken = business.verifyToken(req.body.token);

  try {
    if (verifiedToken) {
      res.status(200).json(verifiedToken);
    } else {
      res.status(401).json({status: false, message: 'verification failed. Invalid login token.'});
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({status: false, message: 'Internal server error.'});
  }
});

app.post('/api/update-or-verify-token', async (req, res) => {
  let verifiedToken = await business.verifyToken(req.body.token);

  try {
    if (verifiedToken) {
      let convoToken = await business.generateToken(verifiedToken)
      res.status(200).json({ status: true, message: 'verification successful', convoToken });
    } else {
      res.status(401).json({ status: false, message: 'verification failed. Invalid login token.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Internal server error.' });
  }
});

app.post('/api/ask', async (req, res) => {
  let userQuery = ""
  let convoToken = business.verifyToken(req.body.token)

  /* abdullah ka experiment
  let previousChat = await business.getChatHistory(convoToken.username)
  console.log(previousChat)
  
  for (c of previousChat){
    for (k of c.messages){
      console.log(k.text)
    }
  } */

  //change started from here
  // console.log('something recieved')
  // console.log(req.body.audio)
  // console.log(typeof req.body.audio)
  // const buffer = Buffer.from(req.body.audio, 'base64');
  // console.log(typeof buffer)

  if (req.body.audio) {
    // console.log('audio recieved')
    // console.log(req.body.audio)
    const buffer = Buffer.from(req.body.audio, 'base64');
    fs.writeFileSync('temp.aac', buffer);
    const inputPath = 'temp.aac';
    const outputPath = 'output.mp3';
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        .output(outputPath)
        .on('end', () => {
          // console.log('Conversion finished');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error:', err);
          reject(err);
        })
        .run();
    });
    userQuery = await speechToText(outputPath);
    console.log(userQuery)
    await business.saveChatHistory(convoToken.username, 'user', userQuery, req.body.time);
  } else {
    // Unable to determine file type
    userQuery = req.body.message;
    await business.saveChatHistory(convoToken.username, 'user', userQuery, req.body.time);
  }

  //change ends from here

  console.log(userQuery)
  console.log(req.body.time)

  

  const messages = [
    {
      role: "system", content: `You are an Academic Advisor in the University of Doha for Science and Technology (UDST). 
    You will help in calculating the GPA of the students. Your name is Genie.` },
    {
      role: "assistant", content: `The formula for calculating the GPA is: 
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
    await business.saveChatHistory(convoToken.username, 'LLM', llmResponse, new Date().toLocaleString());
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
      res.status(401).json({ status: false, message: 'verification failed. Invalid login token.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Internal server error.' });
  }
});

async function textToText() {

}

async function speechToText(audioPath) {
  try {
    const client = new OpenAIClient(process.env.SPEECH_ENDPOINT, new AzureKeyCredential(process.env.SPEECH_API_KEY));
    const deploymentName = process.env.OPENAI_MODEL_NAME;
    const audio = await fs.promises.readFile(audioPath);//Add the speech audio file here.

    const result = await client.getAudioTranscription(deploymentName, audio, { language: 'en' });
    if (result) {
      return result.text;
    }
    return undefined;
  } catch (error) {
    console.error('Failed to convert speech to text:', error);
    return undefined;
  }
}


async function imageToText() {

}

app.get('/api/speech', async (req, res) => {
  console.log('iski zaroorath nai')
})


app.listen(8000, async () => {
  console.log("Application started")
})

