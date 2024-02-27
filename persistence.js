const mongodb = require('mongodb')
const { MONGODB_URI } = require('./config');

let client = undefined
let db = undefined
let users = undefined
let chatHistory = undefined;

async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient(MONGODB_URI)
        await client.connect()
        db = client.db('capstone')
        users = db.collection('users')
        chatHistory = db.collection('chatHistory')
    }
}

async function getUserDetails(username) {
    await connectDatabase()
    let user = await users.findOne({ username: username });
    return user;
}

async function saveChatHistory(username, sender, text) {
    await connectDatabase();
    await chatHistory.updateOne(
        { username: username, ended: false },
        { $push: { messages: { sender: sender, text: text } } },
        { upsert: true }
    );
}

async function endConversation(username) {
    await connectDatabase();
    await chatHistory.updateOne(
        { username: username, ended: false },
        { $set: { ended: true } }
    );
}


module.exports = {
    getUserDetails, 
    saveChatHistory, endConversation
}
