// Polyfill legacy SlowBuffer for Node.js 20+ / 22+ / 26+ compatibility on Render
const { Buffer } = require('buffer');
if (typeof global.SlowBuffer === 'undefined') {
  global.SlowBuffer = class SlowBuffer extends Buffer {};
  if (!global.SlowBuffer.prototype) global.SlowBuffer.prototype = Buffer.prototype;
}

require('dotenv').config({ path: __dirname + '/.env' }); 
const express = require("express");
const http = require("http");
const initSocketManager = require('./sockets/socketManager');
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

const cron = require('node-cron');
const { runDailyBackup } = require('./services/backupService');

require('./routes_new/users-routes.js')(app);
require('./routes_new/dungeons-routes.js')(app);
require('./routes_new/maps-routes.js')(app);
require('./routes_new/planes-routes.js')(app);
require('./routes_new/notifications-routes.js')(app);
require('./routes_new/bots-routes.js')(app);
require('./routes_new/backup-routes.js')(app);

// Schedule daily automated backup job at midnight PST (America/Los_Angeles)
cron.schedule('0 0 * * *', () => {
  console.log('[Cron] Midnight PST trigger: Running automated daily dungeon backup...');
  runDailyBackup().catch(err => {
    console.error('[Cron] Midnight backup job error:', err);
  });
}, {
  scheduled: true,
  timezone: "America/Los_Angeles"
});

app.get('/', (req, res) => {
    res.send("doors and keys server running")
});


const port = process.env.PORT || 5001;
const server = http.createServer(app);
initSocketManager(server);

server.listen(port, () => console.log(`\n Running on port ${port} with WebSockets enabled!\n`));

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message || err }); });