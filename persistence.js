const mongodb = require('mongodb')

let client = undefined
let db = undefined
let users = undefined
let session = undefined

async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient('mongodb://127.0.0.1:27017')
        await client.connect()
        db = client.db('capstone')
        users = db.collection('users')
        chatHistory = db.collection('chat_history')
        session = db.collection('sessiondata')
    }
}

async function getUserDetails(username) {
    await connectDatabase()
    let user = await users.findOne({ username: username });
    return user;
}

async function saveChatHistory(userId, text) {
    await connectDatabase()
    await chatHistory.insertOne({ user_id: userId, chat: text});
}

async function saveSession(sessionKey, expiry, data) {
    await connectDatabase()
    let sessionData = {
        SessionKey: sessionKey,
        Expiry: expiry,
        Data: data,
      };
    
      await session.insertOne(sessionData);
}

async function getSessionData(key) {
    await connectDatabase()
    let session1 = await session.findOne({ SessionKey: key });
    return session1;
}

async function deleteSession(key) {
    await session.deleteOne({SessionKey: key });
}


module.exports = {
    getUserDetails, saveSession, getSessionData, 
    deleteSession,
    saveChatHistory
}