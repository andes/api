const mongoose = require('mongoose');
const bodyParser = require('body-parser');
import * as moment from 'moment';

import { MongoMemoryServer } from 'mongodb-memory-server-global';

import * as CensoController from './censo.controller';


jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

let mongoServer: any;
beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    // const mongoUri = await mongoServer.getConnectionString();
    const mongoUri = 'mongodb://localhost:27017/andes';
    mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test('censo diario', async () => {
    await CensoController.censoDiario({ organizacion: '5bae6b7b9677f95a425d9ee8', timestamp: moment('2019-01-04').toDate(), unidadOrganizativa: '5c8a88e2af621b10273ba23d' });
});
