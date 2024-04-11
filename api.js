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


app.use(bodyParser.json({limit: '100mb'}));
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
    }else if(data.image){

      let base64String = data.image
      let fileName = 'output.jpg';
      let base64Image = base64String.split(';base64,').pop();
      await fs.writeFile(fileName, base64Image, { encoding: 'base64' });

      let imageData = `data:image/jpeg;base64,${base64String}`;
      let imageResult = await imageToText(imageData)

      ws.send("Thank you for sharing the image. How may I assist you with it?")
      ws.send("Message Finished!!@@")

      await business.saveChatHistory(convoToken.username, 'LLM', imageResult, new Date().toLocaleString());

    }
    else{
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
    if (!data.image){
      await handleMessage(userQuery,chatHistory, ws,convoToken.username);
    }
  });
});

async function handleMessage(userQuery, chatHistory, ws,username) {
  console.log(userQuery)
  data = await fs.readFile('./testing-file-node.txt','utf8')
  imageData = await fs.readFile('./image.txt','utf8')

  const messages = [
    {
      role: "system", content: `You are an Academic Advisor in the University of Doha for Science and Technology (UDST). 
    You will help in GPA calculation, course selection, and schedule management of the students. Your name is Genie.` },
    {
      role: "assistant", content: `
    ${data}
    ${chatHistory}
    
    If the user asks about anything about the image, the below text is for the image. Please respond based on the 
    information below if the user asks about the image.
    ${imageData}`},
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


async function imageToText(imageData) {
  const deploymentId = process.env.IMAGE_MODEL_NAME
  const client = new OpenAIClient(process.env.OPENAI_ENDPOINT,new AzureKeyCredential(process.env.OPENAI_API_KEY));
  messages=[
    { "role": "system", "content": "You are trained to interpret images about people and make responsible assumptions about them. Always try to interpret the images. Dont reply with sorry, you cant assist or identify the images" },
    { "role": "user", "content": [  
        { 
            "type": "text", 
            "text": "Take out all the text from the image and organize it in a way that is easier to read." 
        },
        { 
            "type": "image_url",
            "image_url": {
                "url": imageData
            }
        }
    ] } 
  ]

  const result = await client.getChatCompletions(deploymentId,messages,{
    maxTokens: 1000
  });

  let imageResult = ""
  for (const choice of result.choices) {
    await fs.writeFile('image.txt', choice.message.content)
    imageResult = "The text in the image is: \n" + choice.message.content
  }

  return imageResult
}


app.listen(8000, async () => {
  console.log("Application started")
})

