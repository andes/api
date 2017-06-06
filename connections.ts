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
        mongoose.plugin(schemaDefaults);
        if (configPrivate.mongooseDebugMode) {
            mongoose.set('debug', true);
        }

        // Conecta y configura conexiones
        mongoose.connect(`mongodb://${configPrivate.hosts.mongoDB_main}/andes`, { server: { reconnectTries: Number.MAX_VALUE } });
        this.main = mongoose.connection;
        this.mpi = mongoose.createConnection(`mongodb://${configPrivate.hosts.mongoDB_mpi}/andes`, { server: { reconnectTries: Number.MAX_VALUE } });

        this.snomed = mongoose.createConnection(`mongodb://${configPrivate.hosts.snomed}/es-edition`, { server: { reconnectTries: Number.MAX_VALUE } });

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
