const sqlite3 = require("sqlite3").verbose();
const filepath = "./ticketing.db";
const fs = require('fs')
var db = null;

function createDbConnection() {
    if (fs.existsSync(filepath)) {
        db = new sqlite3.Database(filepath);
      return db;
    } else {
      db = new sqlite3.Database(filepath, (error) => {
        if (error) {
          return console.error(error.message);
        }
        createTable(db);
      });
      console.log("Connection with SQLite has been established");
      return db;
    }
  }

function createTable(db) {
    db.exec(`
        CREATE TABLE user
        (
        ID varchar(25),
        nama   VARCHAR(50) NOT NULL,
        password   VARCHAR(50),
        branchCode VARCHAR(5),
        logged_in integer,
        last_login integer
        );
    `);
    db.exec(`
        CREATE TABLE cabang
        (
        branchCode VARCHAR(5) NOT NULL,
        nama   VARCHAR(50) NOT NULL,
        kota   VARCHAR(50) NOT NULL,
        propinsi varchar(25)
      );
    `);
    db.exec(`
        CREATE TABLE transaksi
        (
        cabang   VARCHAR(5) NOT NULL,
        tix_number integer,
        service varchar(10) not null,
        print_time integer,
        user_id varchar(25),
        start_time integer,
        end_time integer,
        survey_level integer
        );
    `);
  }

  console.log(db);
 
  module.exports = {db, createDbConnection};
  
  
