require('dotenv').config();
const HOST = 'tihsdb.cb6c84mgabue.eu-north-1.rds.amazonaws.com';
const USER = 'admin';
const PASSWORD = 'TrainInHealthAndSafety';
const DB = 'learning_app';
const PORTAWS = '3306';

module.exports = {
    HOST: HOST,
    USER: USER,
    PASSWORD: PASSWORD,
    DB: DB
        //  PORTAWS: PORTAWS
};
/*
const HOST = 'tihsdb.cb6c84mgabue.eu-north-1.rds.amazonaws.com';
const USER = 'admin';
const PASSWORD = 'TrainInHealthAndSafety';
const DB = 'learning_app';
const PORTAWS = '3306';

**local**
const HOST = 'localhost';
const USER = 'root';
const PASSWORD = '';
const DB = 'learning_app';
const PORTAWS = '';
module.exports = {
    HOST: HOST,
    USER: USER,
    PASSWORD: PASSWORD,
    DB: DB,
    PORTAWS: PORTAWS
};*/