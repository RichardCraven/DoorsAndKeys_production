require('dotenv').config(); 
const express = require("express");
let mongoose = require('mongoose');
let databaseConfig
 = require('./config/database.config.json');

// const bodyParser = require('body-parser');
const app = express();
// const {authenticate} = require('./modules/auth-module.js');
const cors = require("cors");
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Allow localhost, vercel preview deployments, and dreamtower.world
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /dreamtower\.world$/,
      /vercel\.app$/
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin)) || 
                      origin === process.env.CLIENT_ORIGIN;
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

var fs = require("fs");

// const mongoUrl = `mongodb://${databaseConfig.MONGO_USER}:${databaseConfig.MONGO_PASSWORD}@${databaseConfig.MONGO_HOST}:${databaseConfig.MONGO_PORT}/${databaseConfig.MONGO_DB_NAME}?authSource=${databaseConfig.MONGO_AUTH_DB_NAME}`
const mongoUrl = process.env.MONGODB_URI || `mongodb://localhost:27017/doors_db`
// Connecting mongoDB Database
mongoose.Promise = global.Promise;
mongoose.set('strictQuery', true);
mongoose.connect(mongoUrl, {
  useUnifiedTopology: true,
  useNewUrlParser: true
}).then(() => {
  console.log('testing 123')
  console.log('Mongo Database sucessfully connected!')
},
  error => {
    console.log('Could not connect to Mongo database : ' + error)
  }
)
mongoose.connection.on("connected", () => {
  console.log('connected!');
});


app.use(express.json({limit: '50mb', extended: true}));
app.use(express.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

app.use(cors(corsOptions))

require('./routes_new/users-routes.js')(app);
require('./routes_new/dungeons-routes.js')(app);
require('./routes_new/maps-routes.js')(app);
require('./routes_new/planes-routes.js')(app);

app.get('/', (req, res) => {
    res.send("doors and keys server running")
});


const port = process.env.PORT || 5001;
app.listen(port, ()=> console.log(`\n Running on port ${port}\n`))

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message || err }); });