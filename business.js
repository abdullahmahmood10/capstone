const persistence = require('./persistence')
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');
const crypto = require('crypto')

async function validateCredentials(username, password) {
    let user = await persistence.getUserDetails(username);

    if (user && user.password == hashPassword(password)) {
        // Generate JWT token upon successful authentication
        const token = jwt.sign({ username: user.username, accountType: user.accountType }, JWT_SECRET); // Never Expires
        return token;
    }

    return undefined;
}

async function generateToken(verifiedToken) {
    const token = jwt.sign({ username: verifiedToken.username, accountType: verifiedToken.accountType }, JWT_SECRET, { expiresIn: '30m' }); // expires in 1h
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

async function saveChatHistory(username, sender, text) {
    await persistence.saveChatHistory(username, sender, text);
}

async function endConversation(username) {
    await persistence.endConversation(username);
}

async function getUserDetails(username) {
    return await persistence.getUserDetails(username);
}

module.exports = {
    validateCredentials, getUserDetails, 
    verifyToken, generateToken, endConversation,
    saveChatHistory
}
