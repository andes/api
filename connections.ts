import * as mongoose from 'mongoose';
import * as configPrivate from './config.private';
import * as debug from 'debug';
import { Connections as loggerConnections } from '@andes/log';

function schemaDefaults(schema) {
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false
    });
}

export class Connections {
    static main: mongoose.Connection;
    static mpi: mongoose.Connection;
    static snomed: mongoose.Connection;
    static puco: mongoose.Connection;

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

        if (process.env.NODE_ENV === 'TEST') {
            this.mpi = mongoose.createConnection();
            this.snomed = mongoose.createConnection();
            this.puco = mongoose.createConnection();

        } else {
            // Conecta y configura conexiones
            // 1. PRINCIPAL
            mongoose.connect(configPrivate.hosts.mongoDB_main.host, configPrivate.hosts.mongoDB_main.options);
            this.main = mongoose.connection;

            // 2. MPI
            this.mpi = mongoose.createConnection(configPrivate.hosts.mongoDB_mpi.host, configPrivate.hosts.mongoDB_mpi.options);

            // 3. SNOMED
            this.snomed = mongoose.createConnection(configPrivate.hosts.mongoDB_snomed.host, configPrivate.hosts.mongoDB_snomed.options);

            // 4. PUCO
            this.puco = mongoose.createConnection(configPrivate.hosts.mongoDB_puco.host, configPrivate.hosts.mongoDB_puco.options);

            // 5. LOGGER
            loggerConnections.initialize(configPrivate.logDatabase.log.host, configPrivate.logDatabase.log.options);

            // Configura eventos
            this.configEvents('main', this.main);
            this.configEvents('mpi', this.mpi);
            this.configEvents('snomed', this.snomed);
            this.configEvents('puco', this.puco);
        }


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
