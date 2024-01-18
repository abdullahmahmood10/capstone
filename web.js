const express=require('express')
const bodyParser = require('body-parser')
const handlebars = require('express-handlebars')
const cookieParser = require('cookie-parser')
const business = require('./business')

app = express()
app.set('views', __dirname+"/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())
let urlencodedParser = bodyParser.urlencoded({extended: false})
app.use('/static', express.static(__dirname+'/static'))
app.use(urlencodedParser)
app.use(cookieParser())
app.use(bodyParser.json())

app.get('/', (req,res) => {
    res.render('login', {layout: undefined, message: req.query.message})
})

app.get('/login', (req, res) => {
    res.render('login', {layout: undefined, message: req.query.message})
})

app.post('/login', async (req, res) => {
    let username = req.body.username
    let password = req.body.password
    let userType = await business.validateCredentials(username, password)
    console.log(userType)

    if (userType) {

        let sessionData = {
            username: username,
            accountType: userType,
        };

        let sk = await business.startSession(sessionData);
        res.cookie('sessioncookie', sk.sessionKey)

        if (userType === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/user');
        }
    } 
    else {
      // If the login fails, rendering the login page with an error message
      res.render('login', { layout: undefined, message: 'Invalid username or password' });
    }
})

app.get('/user', async (req, res) => {
    let sessionkey = req.cookies.sessioncookie
    
    if (!sessionkey) {
        res.redirect('/?message=Session%20Expired%20or%20Invalid');
    }
    else {
        let sessionData = await business.getSessionData(sessionkey)

        if (!sessionData) {
            // If no session data is found, redirect to login with an error message
            res.redirect('/?message=Session%20Expired%20or%20Invalid');
        } 
        else if (sessionData.Data.accountType !== 'user') {
            // If the user is not 'standard', redirect to login with an appropriate message
            res.redirect('/?message=Unauthorized%20Access');
        } 
        else {
            // User is authorized, display welcome message
            let name = sessionData.Data.username;
            res.render('user', { layout: undefined, username: name });
        }
    }
})

app.get('/admin', async (req, res) => {
    let sessionkey = req.cookies.sessioncookie
    
    if (!sessionkey) {
        res.redirect('/?message=Session%20Expired%20or%20Invalid');
    }
    else {
        let sessionData = await business.getSessionData(sessionkey)

        if (!sessionData) {
            // If no session data is found, redirect to login with an error message
            res.redirect('/?message=Session%20Expired%20or%20Invalid');
        } 
        else if (sessionData.Data.accountType !== 'admin') {
            // If the user is not 'standard', redirect to login with an appropriate message
            res.redirect('/?message=Unauthorized%20Access');
        } 
        else {
            // User is authorized, display welcome message
            let name = sessionData.Data.username;
            res.render('admin', {layout:undefined, username: name})
        }
    } 
})

app.get('/logout', async (req, res) => {
    let sessionkey = req.cookies.lab7sessionkey
    if (sessionkey) {
        await business.deleteSession(sessionkey)
    }
    res.clearCookie('sessioncookie');
    res.redirect('/')
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