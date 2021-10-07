import { AndesCache } from '@andes/core';
import { Connections as loggerConnections } from '@andes/log';
import * as debug from 'debug';
import * as mongoose from 'mongoose';
import * as configPrivate from './config.private';

function schemaDefaults(schema) {
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false
    });
}

export class Connections {
    static main: mongoose.Connection;
    static snomed: mongoose.Connection;
    static puco: mongoose.Connection = mongoose.createConnection();
    static logs: mongoose.Connection = mongoose.createConnection();

    /**
     * Inicializa las conexiones a MongoDB
     *
     * @static
     *
     * @memberOf Connections
     */
    static initialize() {
        // Configura Mongoose
        (mongoose as any).Promise = global.Promise;
        mongoose.plugin(schemaDefaults);

        // Configura logger de consultas
        const queryLogger = debug('mongoose');
        if (queryLogger.enabled) {
            mongoose.set('debug', (collection, method, query, arg1, arg2, arg3) => queryLogger('%s.%s(%o) %s %s', collection, method, query, (arg2 || ''), (arg3 || '')));
        }

        if (process.env.NODE_ENV === 'test') {
            // eslint-disable-next-line no-console
            console.log('TESTING MODE');
            configPrivate.hosts.mongoDB_main.host = 'mongodb://localhost:27066/andes';
            configPrivate.hosts.mongoDB_puco.host = 'mongodb://localhost:27066/andes';
            configPrivate.logDatabase.log.host = 'mongodb://localhost:27066/andes';
        }


        // Conecta y configura conexiones
        // 1. PRINCIPAL
        mongoose.connect(configPrivate.hosts.mongoDB_main.host, configPrivate.hosts.mongoDB_main.options);
        this.main = mongoose.connection;

        // 2. PUCO
        this.puco = mongoose.createConnection(configPrivate.hosts.mongoDB_puco.host, configPrivate.hosts.mongoDB_puco.options);

        // 3. LOGGER
        loggerConnections.initialize(configPrivate.logDatabase.log.host, configPrivate.logDatabase.log.options);

        this.logs = mongoose.createConnection(configPrivate.logDatabase.log.host, configPrivate.logDatabase.log.options);

        // Configura eventos
        this.configEvents('main', this.main);
        this.configEvents('puco', this.puco);
        this.configEvents('logs', this.logs);
    }

    private static configEvents(name: string, connection: mongoose.Connection) {
        const connectionLog = debug('mongoose:' + name);
        connection.on('connecting', () => connectionLog('connecting ...'));
        connection.on('error', (error) => connectionLog(`error: ${error}`));
        connection.on('connected', () => connectionLog('connected'));
        connection.on('reconnected', () => connectionLog('reconnected'));
        connection.on('disconnected', () => connectionLog('disconnected'));
    }
}

export let AppCache: AndesCache;

if (configPrivate.RedisWebSockets.active) {
    AppCache = new AndesCache({ adapter: 'redis', port: configPrivate.RedisWebSockets.port, host: configPrivate.RedisWebSockets.host });
} else {
    AppCache = new AndesCache({ adapter: 'memory' });
}
