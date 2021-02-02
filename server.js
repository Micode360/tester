//All requirements
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer();
const cors = require("cors");
const mongoose = require("mongoose");
const moment = require('moment');
const exerciseModel = require("./models/exercise.model");

const exerciseLogModel = require("./models/exercise.model").exerciseModel;

require('dotenv').config();

//Connect to DB
const myURI = process.env.ATLAS_URI;
mongoose.connect(myURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }, { useFindAndModify: false });

const connection = mongoose.connection;
connection.on('open', () => {
  console.log("MongoDB database connection established succesfully");
})
//Use the requirements
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



//Send the HTML
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Import model
let user = require("./schema.js").user;

app.post('/api/exercise/new-user', (req, res) => {
  let username = req.body.username;

  exerciseModel.findOne({ username: username }, (err, name) => {
    if (err) return err;

    if (name) res.send('Username already taken')
    else {
      const exerciseData = new exerciseModel({
        username,
        count: 0,
        exercise: []
      });

      exerciseData.save()
        .then((data) => {
          res.json({
            username: data.username,
            _id: data._id
          })
        }).catch(err => res.status(400).json('Error' + err));
    }
  });

});

app.get('/api/exercise/users', (req, res) => {
  exerciseModel.find()
    .then((data) => {
      res.send(data);
    });
});

app.post('/api/exercise/add', (req, res) => {
  const exerciseForm = req.body;

  let momentDate = moment().format('ddd MMM DD YYYY').toString()

  if(exerciseForm.date === '') exerciseForm.date = momentDate;
  else exerciseForm.date =  moment(exerciseForm.date).format('ddd MMM DD YYYY').toString();
  

  const exerciseData = {
    description: exerciseForm.description,
    duration: exerciseForm.duration,
    date: exerciseForm.date
  }



  exerciseModel.findOneAndUpdate({ _id: exerciseForm.userId },{ new: true }, (err, person)=>{
      if(err) return err;
      person.exercise = exerciseData;
      person.save((err, update) =>{
      if(err) return console.log(err);

        res.json(
          {
            username:update.username,
            description:update.exercise[0].description,
            duration:Number(update.exercise[0].duration),
            _id: update._id,
            date: update.exercise[0].date
        })

      })
     })
})


app.get("/api/exercise/log", function(req, res, next) {
  let userId = req.query.userId;
  console.log(userId);
  if (userId) {
    let from = req.query.from ? new Date(req.query.from) : "";
    let to = req.query.to ? new Date(req.query.to) : "";
    let limit = Number(req.query.limit);
    const limitOptions = {};
    if (limit) limitOptions.limit = limit;

    exerciseModel
      .findById(userId)
      .populate({
        path: "exercise",
        match: {},
        select: "-_id",
        options: limitOptions
      })
      .exec((err, data) => {
        console.log(data);
        if (err) next(err);
        if (data) {
          let displayData = {
            id: data.id,
            username: data.username,
            count: 0
          };
          if (from) displayData.from = from.toDateString();
          if (to) displayData.to = to.toDateString();
          displayData.log = data.exercise.filter(item => {
            if (from && to) {
              return item.date >= from && item.date <= to;
            } else if (from) {
              return item.date >= from;
            } else if (to) {
              return item.date <= to;
            } else {
              return true;
            }
          });
          displayData.count = displayData.log.length
          res.json(displayData);
        } else {
          next();
        }
      });
  } else {
    res.send(
      "UserId is required. For example, api/exercise/log?userId=554fejdcdd485fje"
    );
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
