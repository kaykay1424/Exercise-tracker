const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const path = require('path')

const cors = require('cors')

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const mongoose = require('mongoose');


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", function(req,res) {
  MongoClient.connect(process.env.MLAB_URI, (err, db) => {
    db.collection("users").insertOne({username: req.body.username, exercises: []});    
    res.json({username: req.body.username});
 });
});

app.post("/api/exercise/add", function(req,res) {
  MongoClient.connect(process.env.MLAB_URI, (err, db) => {
    db.collection("users").update({username: req.body.name},{$addToSet: {exercises: {description: req.body.description, duration: req.body.duration, date: req.body.date} } });   
    let date = new Date(req.body.date);
    let dateString = date.toDateString();
    res.json({username: req.body.name, description: req.body.description, duration: req.body.duration + " mins", date: dateString}); 
 })
});
app.get("/api/exercise/log/:name?", function(req,res) {
  MongoClient.connect(process.env.MLAB_URI, (err, db) => {
          const username = req.params.name;
          let response = [];
          let query;
          let limit;
          let user;
          let exercise;
          let count = 0;

          if (req.params.name === undefined) {
              response = "Please enter username";
              res.send(response);
          }  
          else {
            query = {username: req.params.name}
            user = db.collection("users").find(query)
            user.toArray(function(err, result) {
              if (err) throw err;
              if (result.length === 0) {
                response = "That username was not found";
                res.send(response);
              }
              else if (result[0].exercises.length > 0) {
                for ( let j = 0; j < result[0].exercises.length;j++) {
                  if (req.query.hasOwnProperty("limit")) {
                    limit = parseInt(req.query.limit);
                  } 
                  else {
                      limit = result[0].exercises.length;
                  }
                  if (count < limit) {
                    let date = new Date(result[0].exercises[j]["date"]);
                    let dateString = date.toDateString();
                    exercise = {
                       description: result[0].exercises[j]["description"],
                       duration: result[0].exercises[j]["duration"],
                       date: dateString
                      };
                    if (req.query.hasOwnProperty("from") || req.query.hasOwnProperty("to") ) {
                        if (req.query.hasOwnProperty("from") && req.query.hasOwnProperty("to")) {
                          if (new Date(result[0].exercises[j]["date"]) > new Date(req.query.from) && new Date(result[0].exercises[j]["date"]) < new Date(req.query.to) ) {
                            response.push(exercise)         
                            count++;
                          }
                      }
                      else if (req.query.hasOwnProperty("from") && !req.query.hasOwnProperty("to")) {
                          if (new Date(result[0].exercises[j]["date"]) > new Date(req.query.from) ) {
                              response.push(exercise) 
                              count++;
                          }
                      }
                      else if (!req.query.hasOwnProperty("from") && req.query.hasOwnProperty("to")) {
                         if (new Date(result[0].exercises[j]["date"]) < new Date(req.query.to) ) {
                             response.push(exercise) 
                             count++;
                          }
                      }
                  }
                  else {     
                    response.push(exercise);
                    count++;
                  }
              } // end of if (count < limit)
           } // end of for loop
           res.json(response);
        } // end of else if (result[0].exercises.length > 0)
        else {
          res.json({username: username, exercises: 0})
        }
      });
    }
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'}) 
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage
  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
