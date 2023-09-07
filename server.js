const express = require('express');
const multer = require('multer');
const https = require('https');


const fs = require('fs');
const dbsqlite = require('./routes/db');
const path = require('path');

const app = express();
const options = {
  key: fs.readFileSync('security/server.key'),
  cert: fs.readFileSync('security/server.cert')
};

const upload = multer({ dest: '/uploads/' ,storage: multer.memoryStorage()});

const server = https.createServer(options, app);

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, 'node_modules/admin-lte/dist')));
app.use('/plugins', express.static(path.join(__dirname, 'node_modules/admin-lte/plugins/')));
app.use('/', express.static(path.join(__dirname,'node_modules/')));
app.use/'/', express.static(path.join(__dirname, 'node_modules/admin-lte/dist/'));

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
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

app.get('/user', (req, res)=>{
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
app.get('/skip', (req, res)=>{
  const cabang = req.query.cabang;
  const user = req.query.user;
  const nomor_tix = req.query.nomor_tix;
  const today = new Date().toISOString().slice(0, 10);
  console.log(cabang, user, nomor_tix);
  db.run("UPDATE transaksi SET end_time = datetime('now'), survey_level='0' WHERE user_id = ? and tix_number=? and cabang=? ", [user, nomor_tix, cabang], (err,rows)=>{
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
app.get('/selesai', (req, res)=>{
  const cabang = req.query.cabang;
  const user = req.query.user;
  const nomor_tix = req.query.nomor_tix;
  const today = new Date().toISOString().slice(0, 10);
  console.log(cabang, user, nomor_tix);
  db.run("UPDATE transaksi SET end_time = datetime('now') WHERE user_id = ? and tix_number=? and cabang=? ", [user, nomor_tix, cabang], (err,rows)=>{
    if(err){
      console.log(err.message);
      res.send({'ERROR':err.message})
    } else {
      console.log('Result ', rows)
      res.send({'status':'OK'});
    }
  })
})

app.get('/cs', (req, res)=>{
  
  const cabang = req.query.cabang;
  const user = req.query.user;
  const today = new Date().toISOString().slice(0, 10);

  // if no parameter, then show the login page

  if(!cabang || !user){
    res.render('login', {error: ''});
  }
  else {
    // check if user is not logged_in, then show the login page. else show the cs page
    db.get("SELECT * FROM user WHERE ID=?",[user], (err, row)=>{
      // if result is null, then user not exist, show login page
      console.log(row);
      if(!row){
        res.render('login', {error: 'Silahkan login terlebih dahulu'});
      } else {
        if(err){
          res.render(err.message);
        } else {

          if(row.logged_in == 0){
            res.render('login', {error: 'Anda belum login'});
          } else {
            // get all rows from transaksi where cabang=cabang, user = user and print_time = today, then send it to cs.ejs
            db.all("SELECT * FROM transaksi WHERE cabang = ? and user_id = ? and strftime('%Y-%m-%d', print_time) = ? and end_time = NULL", [cabang, user, today], (err,rows)=>{
              
              if(err){
                res.send(err.message)
              } else {
                console.log('ROW : ',rows);

                res.render('cs', {user, cabang, rows})
              }
            })
            res.render('cs', {user: row.ID, cabang: row.branchCode, row : row});
          }
        }
      }

      
    })
  }
    
})

app.get('/panggil', (req,res)=>{
  const user = req.query.user;
  const cabang = req.query.cabang;
  const nomor_tix = req.query.nomor_tix
  console.log(cabang, nomor_tix, user)
  db.run("UPDATE transaksi SET start_time = datetime('now'), user_id = ?  WHERE tix_number=? and cabang=? ", [user, nomor_tix, cabang], (err,rows)=>{
    if(err){
      console.log(err.message);
      res.send({'ERROR':err.message})
    } else {
      console.log('Result ', rows)
      res.send({'status':'OK'});
    }
  })
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

// call the queue kiosk
app.get('/queue', (req,res)=>{
  // call it by /queue?cabang=kode&user=userid
  // get filenames from folder ./public/videos include the relative path into videos array and render to queue.ejs
  const cabang = req.query.cabang;
  const user = req.query.user;
  
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
  
  console.log(config);
  res.render('queue', {videos: videos, config: config });
})

app.get('/admin', (req,res)=>{
  // get userid and password from query string, compare to config.admin.userid and config.admin.password
  // if match, then render admin.ejs, else render login.ejs with error message
  const userid = req.query.userid;
  const password = req.query.password;
  const config = require('./config.json');
  if(userid == config.admin.userid && password == config.admin.password){
    res.render('admin');
  } else {
    res.render('login', {error: 'User ID atau Password salah'});
  }
});

app.post('/admin', (req,res)=>{
  // get parameters from query string
  const userid = req.body.userid;
  const password = req.body.password;
  const config = require('./config.json');
  console.log(userid, password);
  if(userid == config.admin.userid && password == config.admin.password){
    res.render('admin');
  } else {
    res.render('login', {error: 'User ID atau Password salah'});
  } 

})
app.get('/import', (req,res)=>{
   res.render('import');
})

app.post('/import/cabang', (req, res)=>{
  const csvData = req.file.buffer.toString('utf-8');
  const rows = csvData.split('\n').slice(1); // exclude the header
  const status = 'CSV data CABANG imported successfully'

  rows.forEach(row => {
    const columns = row.split(',');
    const query = 'INSERT INTO cabang (id,nama, kota) values (?,?,?)';
    const values = [columns[0], columns[1], columns[2]];

    db.run(query, values, error => {
      if(error){
        status = 'CSV data CABANG imported with error ' + error
      }
    })
  })
  
  res.render('import', {status});
})

app.post('/import/user', (req, res)=>{
  const csvData = req.file.buffer.toString('utf-8');
  const rows = csvData.split('\n').split(1); // exclude the header
  const status = 'CSV data USER imported successfully'

  rows.forEach(row => {
    const columns = row.split(',');
    const query = 'INSERT INTO cabang(id, nama, kota) values (?,?,?)';
    const values = [columns[0], columns[1], columns[2]];

    db.run(query.values, error => {
      if(error) {
        status = "CSV data USER imported with ERROR " + error
      }
    })

  })

  res.render('import', {status});
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

function isLoggedIn(userid){
  const today = new Date().toISOString().slice(0, 10);
  db.get("SELECT * FROM user WHERE ID=?",[userid], (err, row)=>{
    if(err){
      console.log(err.message);
      return false;
    } else {
      if(row.last_login == today){
        return true;
      } else {
        return false;
      }
    }
  }
  )
}


app.get('/login',(req,res)=>{
  res.render('login', {error: ''})
})

// port login, check the user and password, if match, set logged_in to 1 and last_login to now
app.post('/login', (req, res)=>{
 // check the user and password, if match, set logged_in to 1 and last_login to now
  const data = req.body;
  console.log(data);
  // if data.isadmin != 1, then check the admin user and password. if match, then check the user and password from config.admin. otherwise, check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
  if(data.isadmin != 1){
    // check the admin user and password. if match, then check the user and password from config.admin. otherwise, check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
    // check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
    db.get("SELECT * FROM user WHERE ID=? and password=?",[data.userid, data.password], (err, row)=>{
      if(err){
        res.render(err.message);
      } else {
        // if result is not null, then user exist and password match
        if(row){
          // check the action, if user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
          if(row.action == 'user'){
            // render cs.ejs with data from ticket table that match the userid and today
            let today = new Date().toISOString().slice(0, 10);
            const sql = "SELECT * FROM transaksi WHERE user_id = ? and strftime('%Y-%m-%d', print_time) = ?";
            db.all(sql, [data.userid, today], (err,rows)=>{
              if(err){
                res.send(err.message)
              } else {
                res.render('cs', {user: row.ID, cabang: row.branchCode, rows : rows});
              }
            })
          } else {
            // render queue with parameters of user and cabang
            res.render('queue', {user: row.ID, cabang: row.branchCode});
          }
        } else {
          res.render('login', {error: 'User ID atau Password salah'});
        }
      }
    })
  
  } else {
    // check the admin user and password. if match, then check the user and password from config.admin. otherwise, check the user and password from table user, if match, check the action = user, then render cs.ejs with data from ticket table that match the userid and today. otherwise render queue with parameters of user and cabang
    const config = require('./config.json');
    if(data.userid == config.admin.userid && data.password == config.admin.password){
      // render admin.ejs
      res.render('admin');
    } else {
      res.render('login', {error: 'User ID atau Password salah'});
    }
  }
})


    

// logout user, set logged_in to 0 and last_login to current time
app.get('/logout', (req, res)=>{
  const userid = req.query.userid;
  db.run("UPDATE user SET logged_in=0, last_login=datetime('now') WHERE ID=?",[userid], (err)=>{
    if(err){
      res.render(err.message);
    } else {
      res.render('login');
    }
  })
}
)


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
