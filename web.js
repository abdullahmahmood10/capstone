const express=require('express')
const bodyParser = require('body-parser')
const handlebars = require('express-handlebars')
const cookieParser = require('cookie-parser')
const business = require('./business')
const OpenAI = require("openai");

app = express()
app.set('views', __dirname+"/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())
let urlencodedParser = bodyParser.urlencoded({extended: false})
app.use('/static', express.static(__dirname+'/static'))
app.use(urlencodedParser)
app.use(cookieParser())
app.use(bodyParser.json())

app.get('/', async (req,res) => {
    let haha = "hahah"
    let userId = "1234"
    await business.saveChatHistory(userId, haha)
    res.render('login', {layout: undefined, message: req.query.message})
})

app.get('/login', (req, res) => {
    res.render('login', {layout: undefined, message: req.query.message})
})

app.post('/login', async (req, res) => {
    let username = req.body.username
    let password = req.body.password
    let userType = await business.validateCredentials(username, password)

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
        let user = await business.getUserDetails(sessionData.Data.username)

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
            let username = sessionData.Data.username;
            let name = user.name;
            res.render('user', { layout: undefined, username: username, name: name});
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
        let user = await business.getUserDetails(sessionData.Data.username)

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
            let username = sessionData.Data.username;
            let name = user.name;
            res.render('admin', {layout:undefined, username: username, name: name})
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
    const openai = new OpenAI({ apiKey: "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" });
    const completion = await openai.chat.completions.create({
        messages: [{"role": "system", "content": `You are an Academic Advisor in the University of Doha for Science and Technology (UDST). 
                    You will help in calculating the GPA of the students.`},
                  {"role": "user", "content": "Calculate My GPA"},
                  {"role": "assistant", "content": `The formula for calculating the GPA is: 
                  (Credits * Grades)/Credits. 
                  If a student asks for calculating their GPA, please ask from them the grades and credit for each course. The grading criteria is:
                  A   =     4
                  B+ =     3.5
                  B   =     3
                  C+  =   2.5
                  C   =   2
                  D+  =   1.5
                  D    =    1
                  F    =   0`},
            {"role": "user", "content": `${userQuery}`}],
        model: "gpt-3.5-turbo",
      });  
    res.json({ response: completion.choices[0].message.content});
})

app.listen(8000, async() => {
    console.log("Application started")
})