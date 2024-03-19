const persistence = require('./persistence')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('./config');


async function validateCredentials(username, password) {
    let user = await persistence.getUserDetails(username);

    if (user && user.password == hashPassword(password)) {
        // Generate JWT token upon successful authentication
        const token = jwt.sign({ username: user.username, accountType: user.accountType, fullName: user.fullName, major: user.major }, JWT_SECRET); // Never Expires
        return token;
    }

    return undefined;
}

async function generateToken(verifiedToken) {
    const token = jwt.sign({ username: verifiedToken.username, accountType: verifiedToken.accountType }, JWT_SECRET); // expires in 1h
    return token
}

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (err) {
        return null; // Token verification failed
    }
}

function hashPassword(pass) {
    let hash = crypto.createHash('sha256')
    hash.update(pass)
    let hashedPass = hash.digest('hex')
    return hashedPass
}

async function saveChatHistory(username, sender, text, time) {
    await persistence.saveChatHistory(username, sender, text, time);
}

async function getChatHistory(username) {
    return await persistence.getChatHistory(username)
}

// async function endConversation(username) {
//     await persistence.endConversation(username);
// }

async function getUserDetails(username) {
    return await persistence.getUserDetails(username);
}

module.exports = {
    validateCredentials, getUserDetails, getChatHistory,
    verifyToken, generateToken,
    saveChatHistory
}
