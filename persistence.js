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

async function saveChatHistory(username, sender, text, time) {
    await connectDatabase();
    await chatHistory.updateOne(
        { username: username },
        { $push: { messages: { sender: sender, text: text, messageTime: time } } },
        { upsert: true }
    );
}

async function getChatHistory(username) {
    await connectDatabase();
    return await chatHistory.find({ username: username}).toArray();
}

// async function endConversation(username) {
//     await connectDatabase();
//     await chatHistory.updateOne(
//         { username: username, ended: false },
//         { $set: { ended: true } }
//     );
// }


module.exports = {
    getUserDetails, getChatHistory,
    saveChatHistory
}
