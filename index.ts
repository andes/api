import * as http from "http";
import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as mongoose from 'mongoose'

var requireDir = require('require-dir');
var swaggerJSDoc = require('swagger-jsdoc');

var app = express();

mongoose.connect('mongodb://10.1.62.17/andes');

// swagger definition
var swaggerDefinition = {
  info: {
    title: 'API ANDES',
    version: '1.0.0',
    description: 'APIs de tablas maestras ANDES',
  },
  host: 'localhost:3002',
  basePath: '/',
};

// options for the swagger docs
var options = {
  // import swaggerDefinitions
  swaggerDefinition: swaggerDefinition,
  // path to the API docs
  apis: ['./routes/*.js'],
};

// initialize swagger-jsdoc
var swaggerSpec = swaggerJSDoc(options);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if ('OPTIONS' == req.method){
        return res.send(200);
    }
    next();
});

var routes = requireDir('./routes/');
for (var route in routes)
    app.use('/api', routes[route]);

//serve swagger
app.get('/swagger.json', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

//Incluimos swagger-ui
app.use('/api-docs', express.static(__dirname + '/api-docs'));

var server = app.listen(3002, function () {
    console.log('Inicio web Server local http://127.0.0.1:3002/');
});

export = app