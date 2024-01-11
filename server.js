const express = require('express');
const multer = require('multer');
const https = require('https');

const cookieParser = require('cookie-parser');

const {configureSession} = require('./libs/session');

const app = express();

const fs = require('fs');
const dbsqlite = require('./libs/db');
const path = require('path');


const options = {
  key: fs.readFileSync('security/server.key'),
  cert: fs.readFileSync('security/server.cert')
};

const upload = multer({ dest: '/uploads/' ,storage: multer.memoryStorage()});

const server = https.createServer(options, app);

const PORT = process.env.PORT || 3000;

const SECRET_KEY= "TICKETING";

app.set('view engine', 'ejs');

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, 'node_modules/admin-lte/dist')));
app.use('/plugins', express.static(path.join(__dirname, 'node_modules/admin-lte/plugins/')));
app.use('/', express.static(path.join(__dirname,'node_modules/')));
app.use/'/', express.static(path.join(__dirname, 'node_modules/admin-lte/dist/'));

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded


app.use(cookieParser());

app.use(configureSession(
  {
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: true,
    // set session expired in 10 hours
    cookie: { maxAge: 10 * 60 * 60 * 1000 }
  }
));

// app.use(fileUpload());

const db = dbsqlite.createDbConnection();

// function for delete and recreate table user
function createTableUser(){
  db.exec('DROP TABLE user');
  db.exec(`
      CREATE TABLE user
      (
      ID varchar(25),
      nama   VARCHAR(50) NOT NULL,
      password   VARCHAR(50) NOT NULL,
      branchcode VARCHAR(50),
      logged_in integer,
      lastlogin text
      );
  `);
}

// function for delete and recreate table cabang
function createTableCabang(){
  db.exec('DROP TABLE cabang');
  db.exec(`

      CREATE TABLE cabang
      ( 
      branchCode VARCHAR(5) NOT NULL,
      nama   VARCHAR(50) NOT NULL,
      kota   VARCHAR(50) NOT NULL,
      propinsi VARCHAR(50),
      last_date text,
      last_tix integer
      );
  `);
}

// function for delete and recreate table transaksi
function createTableTransaksi(){
  // drop table transaksi if exist
  db.exec('DROP TABLE transaksi');
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

// function to create database and all tables
function createDatabase(){
  createTableUser();
  createTableCabang();
  createTableTransaksi();
}

function isLoggedIn(req, res, next){
  // check if user is logged in by checking the session
  // if logged in, then next()
  // if not logged in, then redirect to login page
  if(req.session.logged_in){
    next();
  } else {
    console.log('LOGIN Check : ',req.session)
    res.redirect('/login');
  }
}

function isAdmin(req, res, next){
  if(req.session.isAdmin){
    next();
  } else {
    res.redirect('/login');
  } 
}

function findUser(userId, array){
    var result ={}
    for(var item of array){
      // console.log('findUser', item.ID)
      if (item.ID == userId) {
        // console.log(item);
        result = item;
        break
      }
    }
    return result
}

app.get('/user', isLoggedIn, (req, res)=>{
  let userid = req.query.userid;
  // console.log(isLoggedIn('931'));
  db.all("SELECT * from user", (err, rows)=>{
    // console.rows;
    let user = {}
    if (userid != {} ){
      user = findUser(userid, rows);
    } else {
      user = rows[0];
    }
    //  console.log('Hasil ', user);
     res.render('user', {rows, user});
  })
})
// update 
app.post('/user', (req, res)=>{
  const data = req.body;
  db.get('SELECT * from user WHERE ID=?',[data.ID], (err, result)=>{
    // console.log(result);
    if(result){
      db.run("UPDATE user SET nama=?, password=?, branchcode=? WHERE ID=?",[data.nama, data.password, data.branchcode, data.ID],(err)=>{
        // console.log('updated');
        res.status(200).send('OK Updated');
      })
    } else {
      // add new
      db.run('INSERT INTO user(ID, nama, password, branchcode) VALUES (?,?,?,?)',[data.ID, data.nama, data.password, data.branchcode], (err)=>{
        // console.log('inserted')
        res.status(200).send('OK Inserted');
      })
      
    }
  })
})

app.get('/user/list', (req, res)=>{
  db.all("SELECT * from user", (err, rows)=>{
    // console.log(rows);
    res.json(rows);
  })
})

app.get('/user/delete',(req,res)=>{
  // console.log('Delete', req.query.userid)
  db.run('DELETE FROM user WHERE ID=?',req.query.userid,(err)=>{
    res.status(200).send("Ok Deleted");
  } )
})

//managemen cabang
function findCabang(branchcode, array){
  var result ={}
  for(var item of array){
    // console.log('findCabang', branchcode)
    if (item.branchCode == branchcode) {
      // console.log(item);
      result = item;
      break
    }
  }
  return result 
}

app.get('/cabang', (req,res)=>{
  let cabang = {branchCode: '', nama: '', kota: '', propinsi:''}
  const branchcode = req.query.branchcode;
  db.all("SELECT * FROM cabang", (err,rows)=>{
    console.log('Query cabang');
    if (branchcode != {} ){
      // edit
      
      cabang = findCabang(branchcode, rows);
      console.log('Cabang Edit');
    } else {
      cabang = rows[0]
      // new
    }
    // console.log('GET Cabang')
    res.render('cabang', {cabang, rows})
  })

})

// posting new cabang / update
app.post('/cabang', (req, res)=>{
  let data = req.body;
  console.log('POST Cabang', data);
  db.get('SELECT * from user WHERE ID=?',[data.branchCode], (err, result)=>{
    if(result){
      db.run("UPDATE cabang SET nama=?, kota=?, propinsi=? WHERE branchCode=?",[data.nama, data.kota, data.propinsi, data.branchCode],(err)=>{
        // console.log('updated');
        res.status(200).send('OK Updated');
      })
    } else {
      // add new
      db.run('INSERT INTO user(branchCode, nama, kota, propinsi) VALUES (?,?,?,?)',[data.branchCode, data.nama, data.kota, data.propinsi], (err)=>{
        // console.log('inserted')
        res.status(200).send('OK Inserted');
      })
      
    }    
  })

})

// import data user from single csv file
app.post('/import/user', upload.single("user"), (req, res)=>{
  
  const csvData = req.file.buffer.toString('utf-8');
  // console.log(csvData);
  const rows = csvData.split('\n').slice(1); // exclude the header
  let status = 'CSV data USER imported successfully';

  // emptying table user 
  db.run('DELETE FROM user', (err)=>{
    if(err){
      console.log(err.message);
    }
  })

  rows.forEach(row => {
    const columns = row.split(';');
    const query = 'INSERT INTO user (ID, nama, password, branchCode) values (?,?,?,?)';
    const values = [columns[0], columns[1],'123456', columns[5]];
    // console.log("Row " , row);
   
    if (row != ''){
      db.run(query, values, error => {
        if(error){
          console.log(error);
          status = 'CSV data USER imported with error ' + error
        }
      })
    }
  })
  res.render('import',{status});
})

// import data cabang
app.post('/import/cabang', upload.single("cabang"),(req, res)=>{
  const csvData = req.file.buffer.toString('utf-8');
  // console.log(csvData);
  const rows = csvData.split('\n').slice(1); // exclude the header
  let status = 'CSV data CABANG imported successfully';

  // emptying table user 
  db.run('DELETE FROM cabang', (err)=>{
    if(err){
      console.log(err.message);
    }
  })
  rows.forEach(row => {
    const columns = row.split(';');
    const query = 'INSERT INTO cabang (branchCode, nama, kota, propinsi) values (?,?,?,?)';
    const values = [columns[1], columns[2],columns[3], columns[4]];
    // console.log("Row " , row);
   
    if (row != ''){
      db.run(query, values, error => {
        if(error){
          console.log(error);
          status = 'CSV data CABANG imported with error ' + error
        }
      })
    }
  })
  res.render('import',{status});
  

})

// new ticket triggered

app.get('/newtix', (req, res)=>{
   const cabang = req.query.cabang;
   const servis = req.query.service;
   const user = req.query.user;
   const today = new Date().toISOString().slice(0, 10);
   console.log(cabang, servis, user, today);
 
   //  dapatkan nomor tiket terbaru, pada hari ini

   db.get("SELECT max(tix_number) from transaksi WHERE cabang = ? and user_id = ? and strftime('%Y-%m-%d', print_time) = ?", [cabang, user, today], (err, row)=>{
    if(err){
      res.render(err.message)
    } else {
      new_tix = row['max(tix_number)'] + 1;
      let sql = "INSERT INTO transaksi(cabang, user_id, service, tix_number, print_time) values (?,?,?,?,CURRENT_TIMESTAMP)";
      db.run(sql, [cabang, user, servis, new_tix], (err)=>{
        if(err){
          console.log(err.message);
          res.send('ERROR:', err.message);
        } else {
            const jsonData = {
              'cabang' : cabang,
              'user' : user,
              'servis' : servis,
              'new_tix': new_tix
              
            }
          res.send(jsonData);
        }
      })
    }
   } )
})

// skip route
app.get('/skip', isLoggedIn, (req, res)=>{
  const cabang = req.query.cabang;
  const user = req.query.user;
  const nomor_tix = req.query.nomor_tix;
  const today = new Date().toISOString().slice(0, 10);
  console.log(cabang, user, nomor_tix);
  db.run("UPDATE transaksi SET end_time = datetime('now'), survey_level='0' WHERE user_id = ? and tix_number=? and cabang=? and strftime('%Y-%m-%d', print_time) = ? ", [user, nomor_tix, cabang, today], (err,rows)=>{
    if(err){
      console.log(err.message);
      res.send({'ERROR':err.message})
    } else {
      console.log('Result ', rows)
      res.send({'status':'OK'});
    }
  })
})

// selesai route
app.get('/selesai', isLoggedIn, (req, res)=>{
  const cabang = req.query.cabang;
  const user = req.query.user;
  const nomor_tix = req.query.nomor_tix;
  const today = new Date().toISOString().slice(0, 10);
  console.log(cabang, user, nomor_tix);
  // make sql stateme to update transaksi table. set end_time to now where user_id = user, date(print_time) = today and  tix_number = nomor_tix, and cabang = cabang  
  const sql = "UPDATE transaksi SET end_time = datetime('now') WHERE user_id = ? and tix_number=? and cabang=? and strftime('%Y-%m-%d', print_time) = ? ";
  db.run(sql, [user, nomor_tix, cabang, today], (err,rows)=>{

    if(err){
      console.log(err.message);
      res.send({'ERROR':err.message})
    } else {
      console.log('Result ', rows)
      res.send({'status':'OK'});
    }
  })
})

app.get('/panggil', isLoggedIn, (req,res)=>{
  const user = req.query.user;
  const cabang = req.query.cabang;
  const nomor_tix = req.query.nomor_tix
  const today = new Date().toISOString().slice(0, 10);
  console.log(cabang, nomor_tix, user)
  db.run("UPDATE transaksi SET start_time = datetime('now'), user_id = ?  WHERE tix_number=? and cabang=? and strftime('%Y-%m-%d', print_time) = ?", [user, nomor_tix, cabang, today], (err,rows)=>{
    if(err){
      console.log(err.message);
      res.send({'ERROR':err.message})
    } else {
      console.log('Result ', rows)
      res.send({'status':'OK'});
    }
  })
})

app.get('/cs', isLoggedIn, (req, res)=>{
  
  // get variables from session
  const user = req.session.user;
  const cabang = req.session.cabang;
  const today = new Date().toISOString().slice(0, 10);

  console.log('CS User Login : ', user, cabang, today);

  // create sql statement to select all rows from transaksi where cabang=cabang, user = user, print_time = today, and end_time is null
  const sql = "SELECT * FROM transaksi WHERE cabang = ? and user_id = ? and strftime('%Y-%m-%d', print_time) = ? and end_time IS NULL";

  // execute sql statement
  db.all(sql, [cabang, user, today], (err,rows)=>{

    if(err){
      res.send(err.message)
    } else {
      console.log('ROW : ',rows);

      res.render('cs', {user, cabang, rows})
    }
  })
  // res.render('cs', {user: row.ID, cabang: row.branchCode, row : rows}); 
})

app.post('/survey', isLoggedIn, (req, res)=>{

})

app.get('/reportcabang', (req, res)=>{
  const cabang = req.query.cabang;
  const user = req.query.user;

  db.all("SELECT * from cabang", (err, rows)=>{
    if(err){
      res.send(err.message);
    } else {
      res.render('reportcabang', {rows})
    }
  })
  
})

app.get('/reportuser', (req, res)=>{
  const cabang = req.query.cabang;
  const user = req.query.user;

  db.all("SELECT * from user", (err, rows)=>{
    if(err){
      res.send(err.message);
    } else {
      res.render('reportuser', {rows})
    }
  })
})

app.get('/', (req,res)=>{
  let sql = "SELECT max(tix_number) from transaksi WHERE cabang = ?";
    db.get(sql, ['030'], (err, row)=>{
      if(err){
        res.render( err.message);
      } else {
        last_tix = row['max(tix_number)'] + 1;
        res.render('home', {last_tix});
      }
    })    
})

app.get('/demo', (req,res)=>{
    res.render('demo');
})

app.get('/queue1', isLoggedIn, (req,res)=>{
  const cabang = req.query.cabang;
  const user = req.query.userid;
  const queueState = req.session.queueState;
  if(!queueState){
    let queueState = 'start';
    req.session.queueState = queueState;
    console.log('Queue State : ', queueState)
  }

  const fs = require('fs');
  const videos = [];
  const videoDir = './public/videos';
  fs.readdirSync(videoDir).forEach(file => {  
    videos.push('/public/videos/' + file);
  })

  data = {user: user, cabang: cabang, queueState : queueState, videos : videos};
  console.log('Data : ', data	)
  res.render('queue1', data);
})

// call the queue kiosk
app.get('/queue', isLoggedIn, (req,res)=>{
  // call it by /queue?cabang=kode&user=userid
  // get filenames from folder ./public/videos include the relative path into videos array and render to queue.ejs
  const cabang = req.query.cabang;
  const user = req.query.userid;
  console.log('Queue : ', cabang, user)
  // if no parameter, show home screen, then exit function
  if(!cabang || !user){
    res.render('home');
    return;
  }

  // console.log(cabang);
  const fs = require('fs');
  const videos = [];
  const videoDir = './public/videos';
  fs.readdirSync(videoDir).forEach(file => {  
    videos.push('/public/videos/' + file);
  })

  // read config.json and pass to queue.ejs
  var config = require('./config.json');
// add cabang and user to config
  config.cabang = cabang;
  config.user = user;
  // req.session.isLoggedIn = true;
  console.log(config);
  res.render('queue', {videos: videos, config: config });
})

app.post('/queue', (req,res)=>{
  req.session.logged_in = false;
  // parameters userid and password. if it is match with user database, send the status OK, otherwise send the status ERROR
  const userid = req.body.userid;
  const password = req.body.password;
  const config = require('./config.json');
  console.log(userid, password);

  db.get('SELECT * FROM user WHERE ID=? and password=?',[userid, password], (err, row)=>{
    console.log(row);
    if(err){
      res.send(err.message);
    } else {
      if(row){
        // send status OK and send the row data as json
        req.session.logged_in = true;
        res.send({'status':'OK', 'row':row});
      } else {
        res.send('ERROR');
      }
    }
  })
})

app.get('/admin', isAdmin, (req,res)=>{
  // get userid and password from query string, compare to config.admin.userid and config.admin.password
  // if match, then render admin.ejs, else render login.ejs with error message
  // const userid = req.query.userid;
  // const password = req.query.password;
  // const config = require('./config.json');
  // // console.log('Admin : ', req.session.isAdmin  );
  console.log(res.data);
  if(req.session.isAdmin){
    res.render('admin');
  } else {
    res.render('login', {error: 'User ID atau Password salah'});
  }
});

app.post('/admin', isAdmin, (req,res)=>{
  // get parameters from query string
  const userid = req.body.userid;
  const password = req.body.password;
  const config = require('./config.json');
  console.log('Admin is logged in: ', userid, password);
  if(userid == config.admin.userid && password == config.admin.password){
    req.session.isAdmin = true;
    res.send('success');
  } else {
    res.send('error');
  } 
})

app.get('/import', isAdmin, (req,res)=>{
   res.render('import');
})

app.get('/update', (req,res)=>{
  // create file "update.dat" with content "updating source from github"	
  console.log("Updating source from github");
  const fs = require('fs');
  fs.writeFile('update.dat', 'updating source from github', (err)=>{
    if(err){
      res.send(err.message);
    } else {
      res.send('OK');
    }
  })
})


// check the login state of the user. if last_login = today, then return true, else return false

// function isLoggedIn(userid){
//   const today = new Date().toISOString().slice(0, 10);
//   db.get("SELECT * FROM user WHERE ID=?",[userid], (err, row)=>{
//     if(err){
//       console.log(err.message);
//       return false;
//     } else {
//       if(row.last_login == today){
//         return true;
//       } else {
//         return false;
//       }
//     }
//   }
//   )
// }


app.get('/login',(req,res)=>{
  res.render('login', {error: ''})
})

// port login, check the user and password, if match, set logged_in to 1 and last_login to now
app.post('/login', (req, res)=>{
 // check the user and password, if match, set logged_in to 1 and last_login to now
  const data = req.body;
  console.log('LOGIN : ',data);
  // if data.isadmin != 1, then check the admin user and password. if match, then check the user and password from config.admin. otherwise, check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
  if(data.isadmin == 0){
    console.log('Is NOT ADMIN');
    // check the admin user and password. if match, then check the user and password from config.admin. otherwise, check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
    // check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
    db.get("SELECT * FROM user WHERE ID=? and password=?",[data.userid, data.password], (err, row)=>{
      if(err){
        res.render(err.message);
      } else {
        // if result is not null, then user exist and password match
        if(row){
          config = require('./config.json');
          config.user = data.userid;
          config.cabang = row.branchCode;
          const fs = require('fs');
          const videos = [];
          const videoDir = './public/videos';
          fs.readdirSync(videoDir).forEach(file => {  
            videos.push('/public/videos/' + file);
          })
          // console.log("Action : ", data.action)
          // check the action, if user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
          if(data.action == 'user'){
            console.log('User LOGIN', config);
            // render cs.ejs with data from ticket table that match the userid and today
            let today = new Date().toISOString().slice(0, 10);
            const sql = "SELECT * FROM transaksi WHERE user_id = ? and strftime('%Y-%m-%d', print_time) = ?";
            db.all(sql, [data.userid, today], (err,rows)=>{
              if(err){
                res.send(err.message)
              } else {
                // send user are set to logged_in = 1 and last_login = now, and save it to the session, then send the status OK
                req.session.logged_in = true;
                req.session.user = data.userid;
                req.session.cabang = row.branchCode;
                console.log('Session : ', req.session);
                // res.send({'status':'OK'});
                res.redirect('/cs');
                // res.render('cs', {user: config.user, cabang: config.cabang, rows : rows});
              }
            })
          } else {
            // render queue with parameters of user and cabang
            
            console.log('Queue LOGIN', config);
            res.render('queue', {videos: videos, config: config});
          }
        } else {
          res.render('login', {error: 'User ID atau Password salah'});
        }
      }
    })
  
  } else {
    // check the admin user and password. if match, then check the user and password from config.admin. otherwise, check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
    const config = require('./config.json');
    console.log('Is ADMIN', config.admin.userid, config.admin.password);
    if(data.userid == config.admin.userid && data.password == config.admin.password){
      // render admin.ejs
      req.session.isAdmin = true;
      console.log('Session ADMIN : ', req.session	)
      res.redirect('admin');
    } else {
      res.render('login', {error: 'User ID atau Password salah'});
    }
  }
})


// logout user, set logged_in to 0 and last_login to current time
app.get('/logout', (req, res)=>{
  const userid = req.query.userid;
  req.session.logged_in = false;
  req.session.isAdmin = false;
  req.session.queueState = '';
  res.redirect('/login');
}
)

app.get('/security', (req, res)=>{
  // set the html headers with key=login_state = 1
  res.setHeader('login_state', '1');
  res.render('security');
})

app.post('/postman',  isLoggedIn, (req, res)=>{
  // get the html headers
  console.log('POST Headers : ',req.headers);
  // get the authorization header
  console.log('Authorization : ', req.headers.authorization);
  res.send(req.headers)

})

app.get('/postman', isLoggedIn, (req, res)=>{
  // get the html headers
  console.log('GET Headers : ',req.headers);
  // get the authorization header
  console.log('Authorization : ', req.headers.authorization);
  res.send(req.headers)
})

// show reports

app.get('/report', (req, res)=>{


})


// app.post('/login', (req, res)=>{

// // set database of user to logged_in to 1 and last_login to current time
//   const data = req.body;
//   console.log(data);

//   // check if user exist and password match. if yes, set logged_in to 1 and last_login to current time
//   db.get("SELECT * FROM user WHERE ID=? and password=?",[data.userid, data.password], (err, row)=>{
//     if(err){
//       res.render(err.message);
//     } else {
//       if(row){
//         db.run("UPDATE user SET logged_in=1, last_login=datetime('now') WHERE ID=?",[data.userid], (err)=>{
//           if(err){
//             res.render(err.message);
//           } else {
//             // render cs.ejs with data from user and cabang
//             res.render('cs', {user: row.ID, cabang: row.branchCode});
            
//           }
//         })
//       } else {
//         res.render('login', {error: 'User ID atau Password salah'});
//       }
//     }
//   })

// })

app.get('/reset', (req, res)=>{
  const filepath = "./ticketing.db";
  db.close();
    fs.unlink(filepath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      } else {
        console.log('File deleted successfully');
      }
    });

});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

// server.listen(PORT, () => {
//   console.log('Server listening on port 443');
// });
