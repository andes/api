import * as mongoose from 'mongoose';
import { schemaDefaults } from './mongoose/defaults';
import * as configPrivate from './config.private';
import * as debug from 'debug';

export class Connections {
    static main: mongoose.Connection;
    static mpi: mongoose.Connection;
    static snomed: mongoose.Connection;

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
        let queryLogger = debug('mongoose');
        if (queryLogger.enabled) {
            mongoose.set('debug', (collection, method, query, arg1, arg2, arg3) => queryLogger('%s.%s(%o) %s %s', collection, method, query, (arg2 || ''), (arg3 || '')));
        }

        // Conecta y configura conexiones
        // 1. PRINCIPAL
        mongoose.connect(`${configPrivate.hosts.mongoDB_main.host}`, { auth: configPrivate.hosts.mongoDB_main.auth, server: configPrivate.hosts.mongoDB_main.server });
        this.main = mongoose.connection;

        // 2. MPI
        this.mpi = mongoose.createConnection(`${configPrivate.hosts.mongoDB_mpi.host}`, { auth: configPrivate.hosts.mongoDB_mpi.auth, server: configPrivate.hosts.mongoDB_mpi.server });

        // 3. SNOMED
        this.snomed = mongoose.createConnection(`${configPrivate.hosts.mongoDB_snomed.host}`, { auth: configPrivate.hosts.mongoDB_snomed.auth, server: configPrivate.hosts.mongoDB_snomed.server });

        // Configura eventos
        this.configEvents('main', this.main);
        this.configEvents('mpi', this.mpi);
        this.configEvents('snomed', this.snomed);
    }

    private static configEvents(name: string, connection: mongoose.Connection) {
        let connectionLog = debug('mongoose:' + name);
        connection.on('connecting', () => connectionLog('connecting ...'));
        connection.on('error', (error) => connectionLog(`error: ${error}`));
        connection.on('connected', () => connectionLog('connected'));
        connection.on('reconnected', () => connectionLog('reconnected'));
        connection.on('disconnected', () => connectionLog('disconnected'));
    }
}
