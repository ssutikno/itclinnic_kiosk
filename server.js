const express = require('express');
const fs = require('fs');
const multer = require('multer');
const dbsqlite = require('./routes/db');
const app = express();
const path = require('path');

app.set('view engine', 'ejs');

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, 'node_modules/admin-lte/dist')));
app.use('/plugins', express.static(path.join(__dirname, 'node_modules/admin-lte/plugins/')));
app.use('/', express.static(path.join(__dirname,'node_modules/')));
app.use/'/', express.static(path.join(__dirname, 'node_modules/admin-lte/dist/'));

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const db = dbsqlite.createDbConnection();

// check the login state of the user. if last_login - now > 1 hour, should relogin.
function isLoggedIn(userId){
    db.get("SELECT * FROM user WHERE ID=?",[userId],(err, row)=>{      
      // console.log(userId, row);
      return row;
    })
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
    console.log(rows);
    res.json(rows);
  })
})

app.get('/user/delete',(req,res)=>{
  console.log('Delete', req.query.userid)
  db.run('DELETE FROM user WHERE ID=?',req.query.userid,(err)=>{
    res.status(200).send("Ok Deleted");
  } )
})

app.get('/newtix', (req, res)=>{
   const cabang = req.query.cabang;
   const servis = req.query.servis;
   const today = new Date().toISOString().slice(0, 10);
  
   //  dapatkan nomor tiket terbaru, pada hari ini

   db.get("SELECT max(tix_number) from transaksi WHERE cabang = ? and strftime('%Y-%m-%d', print_time) = ?", [cabang, today], (err, row)=>{
    if(err){
      res.render(err.message)
    } else {
      new_tix = row['max(tix_number)'] + 1;
      db.run("INSERT INTO transaksi(cabang,service, tix_number, print_time) values (?,?,?,CURRENT_TIMESTAMP)", [cabang, servis, new_tix], (err)=>{
        if(err){
          console.log(err.message);
          res.send('ERROR');
        } else {
            const jsonData = {
              'cabang' : cabang,
              'servis' : servis,
              'new_tix': new_tix
              
            }
          res.send(jsonData);
        }
      })
    }
   } )
})

app.get('/show', (req, res)=>{
  const cabang = req.query.cabang;
  const user = req.query.user;
  const today = new Date().toISOString().slice(0, 10);

  // console.log('SHOW : ',cabang);
  db.all("SELECT * FROM transaksi WHERE cabang = ? and strftime('%Y-%m-%d', print_time) = ?", [cabang, today], (err,row)=>{
    if(err){
      res.send(err.message)
    } else {
      // console.log('Number of rows returned:', row.length);
      // console.log(row);
      // res.json(row);
      res.render('cs', {user, cabang, row})
    }
  })

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


app.get('/generate/:table', (req,res)=>{
  switch (table) {
    case 'user':
      db.exec('DROP TABLE user');
      db.exec(`
          CREATE TABLE user
          (
          ID varchar(25),
          nama   VARCHAR(50) NOT NULL,
          password   VARCHAR(50) NOT NULL,
          kota VARCHAR(50),
          logged_in integer,
          lastlogin text
          );
      `);
      break;
    case 'cabang':
      db.exec('DROP TABLE cabang');
      db.exec(`
          CREATE TABLE cabang
          (
          ID VARCHAR(5) NOT NULL,
          nama   VARCHAR(50) NOT NULL,
          kota   VARCHAR(50) NOT NULL,
          last_date text,
          last_tix integer
          );
      `);
      break;
    case 'transaksi':
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
      break;
  }
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
  // call it by /queue?cabang=kode&kota=kota
  // get filenames from folder ./public/videos include the relative path into videos array and render to queue.ejs
  const kode = req.query.cabang;
  const kota = req.query.kota;
  var cabang = {"kode":kode,
                "kota":kota}
  
    console.log(cabang,kota);
  const fs = require('fs');
  const videos = [];
  const videoDir = './public/videos';
  fs.readdirSync(videoDir).forEach(file => {  
    videos.push('/public/videos/' + file);
  })

  // read config.json and pass to queue.ejs
  var config = require('./config.json');
  config = { "services":config.services, cabang }
  console.log(config);
  res.render('queue', {videos: videos, config: config});
})
// call the CS client app
app.get('/cs', (req,res)=>{
    // call /cs?cabang=kode&csid=csid
    const cs = "Hello";
    res.render('cs',{cs})
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

app.get('/login',(req,res)=>{
  isLoggedIn('030');
  res.render('login')
})

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
