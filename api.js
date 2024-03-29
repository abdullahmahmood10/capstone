const express = require('express');
const app = express();
const business = require('./business')
const cors = require('cors');
const bodyParser = require('body-parser')
require('dotenv').config({ path: './environment.env' }); // Load environment variables from .env file
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const WebSocket = require('ws');

const fs = require("fs/promises"); //changed

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

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', async function connection(ws) {
  ws.on('message', async function incoming(message) {
    let data = JSON.parse(message)
    let userQuery = ""
    let convoToken = business.verifyToken(data.token)
    if (data.audio) {
      const buffer = Buffer.from(data.audio, 'base64');
      await fs.writeFile('temp.aac', buffer);
      const inputPath = 'temp.aac';
      const outputPath = 'output.mp3';
      await new Promise((resolve, reject) => {
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
      await business.saveChatHistory(convoToken.username, 'user', userQuery, data.time);
    }else{
      userQuery = data.message
      await business.saveChatHistory(convoToken.username, 'user', userQuery, data.time);
    }

    
    let previousChat = await business.getChatHistory(convoToken.username)
    let chatHistory=""
    for (c of previousChat){
      for (k of c.messages){
        chatHistory+=k.text+ "\n"
      }
    }

    await handleMessage(userQuery,chatHistory, ws,convoToken.username); // Handle incoming message
  });
});

async function handleMessage(userQuery, chatHistory, ws,username) {
  console.log(userQuery)
  data = await fs.readFile('./testing-file-node.txt','utf8')
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
    F    =   0 
    ${data}
    ${chatHistory}`},
    { role: "user", content: `${userQuery}` },
  ];

  // Create an OpenAI client
  const client = new OpenAIClient(process.env.OPENAI_ENDPOINT, new AzureKeyCredential(process.env.OPENAI_API_KEY));
  const deploymentId = process.env.OPENAI_MODEL_NAME;
  let llmResponse=""
  try {
    // Generate completion for each message
    const events = await client.streamChatCompletions(deploymentId, messages);
    for await (const event of events) {
      for (const choice of event.choices) {
          const delta = choice.delta?.content;
          if (delta !== undefined) {
            llmResponse+=delta
            await new Promise(resolve => setTimeout(resolve, 50));
            ws.send(delta)
          }
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
  ws.send("Message Finished!!@@")
  await business.saveChatHistory(username, 'LLM', llmResponse, new Date().toLocaleString());
}

// app.post('/api/end-convo', async (req, res) => {
//   let verifiedToken = await business.verifyToken(req.body.token)

//   try {
//     if (verifiedToken) {
//       await business.endConversation(verifiedToken.username);
//       res.status(200).json({ status: true, message: 'Conversation ended successfully.' });
//     } else {
//       res.status(401).json({ status: false, message: 'verification failed. Invalid login token.' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: false, message: 'Internal server error.' });
//   }
// });


async function speechToText(audioPath) {
  try {
    const client = new OpenAIClient(process.env.SPEECH_ENDPOINT, new AzureKeyCredential(process.env.SPEECH_API_KEY));
    const deploymentName = process.env.OPENAI_MODEL_NAME;
    const audio = await fs.readFile(audioPath);//Add the speech audio file here.

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


app.listen(8000, async () => {
  console.log("Application started")
})

