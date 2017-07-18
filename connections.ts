import * as mongoose from 'mongoose';
import { schemaDefaults } from './mongoose/defaults';
import * as configPrivate from './config.private';

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
        if (configPrivate.mongooseDebugMode) {
            mongoose.set('debug', true);
        }

        // Conecta y configura conexiones

        // 1. PRINCIPAL
        mongoose.connect(`${configPrivate.hosts.mongoDB_main.host}`, { auth: configPrivate.hosts.mongoDB_mpi.auth, server: configPrivate.hosts.mongoDB_mpi.server });
        this.main = mongoose.connection;

        // 2. MPI
        this.mpi = mongoose.createConnection(`${configPrivate.hosts.mongoDB_mpi.host}`, { auth: configPrivate.hosts.mongoDB_mpi.auth, server: configPrivate.hosts.mongoDB_mpi.server });

        // 3. SNOMED
        this.snomed = mongoose.createConnection(`${configPrivate.hosts.mongoDB_snomed.host}`, { auth: configPrivate.hosts.mongoDB_snomed.auth, server: configPrivate.hosts.mongoDB_snomed.server });

        // Configura eventos
        this.configEvents('MongoDB', this.main);
        this.configEvents('MPI', this.mpi);
        this.configEvents('SNOMED', this.snomed);
    }

    private static configEvents(name: string, connection: mongoose.Connection) {
        connection.on('connecting', function () {
            console.log(`[${name}] Connecting ...`);
        });

        connection.on('error', function (error) {
            console.log(`[${name}] Error: ${error}`);
            // try {
            //     mongoose.disconnect();
            // } catch (e) {
            // }
        });
        connection.on('connected', function () {
            console.log(`[${name}] Connected`);
        });
        connection.once('open', function () {
            console.log(`[${name}] Open`);
        });
        connection.on('reconnected', function () {
            console.log(`[${name}] Reconnected`);
        });
        connection.on('disconnected', function () {
            console.log(`[${name}] Disconnected`);
        });
    }
}
