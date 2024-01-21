const persistence = require('./persistence')
const crypto = require('crypto')


async function validateCredentials(username, password) {
    let user = await persistence.getUserDetails(username);

    if (user && user.password === password) {
    return user.accountType;
    }

    return undefined;
}

async function startSession(data) {
    let sessionKey = crypto.randomBytes(16).toString('hex')
    let expiry = new Date(Date.now() + 3 * 60 * 60 * 1000 ) // 3hr


    await persistence.saveSession(sessionKey,expiry, data);

    return {
        sessionKey,
        expiry}
}

async function getSessionData(key) {
    return await persistence.getSessionData(key)
}

async function terminateSession(key) {
    return await persistence.deleteSession(key)
}

async function getUserDetails(username) {
    return await persistence.getUserDetails(username);
}

async function deleteSession(key) {
    await persistence.deleteSession(key)
}
module.exports = {
    validateCredentials, getUserDetails,
    startSession, getSessionData, terminateSession,
    deleteSession
}