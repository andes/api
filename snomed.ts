import * as mongoose from 'mongoose';

mongoose.set('debug', true);

var connection = mongoose.createConnection('mongodb://10.1.62.17/es-edition');

connection.on('error', function(err){
  if(err) throw err;
});

connection.once('open', function callback () {
  console.info('Mongo db connected successfully');
});

export let snomedDB = connection;