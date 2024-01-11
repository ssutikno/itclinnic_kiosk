const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

function configureSession(){
    return session({
        secret : 'my-secret',
        resave : false,
        saveUninitialized : false,
        store : new SQLiteStore({
            db : 'sessions.db',
            dir:    '.'
        })
    });         
}   

module.exports = {configureSession};

