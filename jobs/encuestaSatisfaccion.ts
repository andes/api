import { EncuestasSql } from '../config.private';
import * as sql from 'mssql';
import { notificacionesEncuestaLog } from '../modules/turnos/citasLog';
import { WebHook } from '../modules/webhook/webhook.schema';
import * as mongoose from 'mongoose';
import { handleHttpRequest } from '../utils/requestHandler';
import { userScheduler } from '../config.private';
import { Constantes } from '../modules/constantes/constantes.schema';
import moment = require('moment');

const constanteKey = 'encuesta-envio';
const query = 'SELECT * FROM Mensajes WHERE MsgEnviado = 0 OR MsgEnviado IS NULL';

const config = {
    user: EncuestasSql.auth.user,
    password: EncuestasSql.auth.password,
    server: EncuestasSql.serverSql.server,
    database: EncuestasSql.serverSql.database,
    connectionTimeout: 5000,
    requestTimeout: 25000
};

async function run(done) {
    try {
        let time: number;
        timeOut().then(num => {
            time = num;
        });
        const pool = await new sql.ConnectionPool(config).connect();
        const result = await new sql.Request(pool).query(query);
        for (const res of result.recordset) {
            const dtoMensaje: any = {
                mensaje: constanteKey,
                telefono: res.Telefono,
                fecha: moment(res.Fecha).add(1, 'day').locale('es').format('dddd DD [de] MMMM'),
                URL_Encuesta: res.URL_Encuesta,
            };
            const resp = await send('encuestas:enviar', dtoMensaje);
            if (resp) {
                const queryUp = 'UPDATE Mensajes SET MsgEnviado = 1 WHERE MensajeId = ' + res.MensajeId;
                await new sql.Request(pool).query(queryUp);
            }
            await new Promise(resolve => setTimeout(resolve, time));
        }
        await pool.close();
        done();
    } catch (err) {
        notificacionesEncuestaLog.error('sql.request', query, err, userScheduler);
        return done(err);
    }
}

async function send(event, datos) {

    const subscriptions: any = await WebHook.findOne({
        active: true,
        event
    });

    if (subscriptions) {
        const data = {
            id: new mongoose.Types.ObjectId(),
            subscription: subscriptions._id,
            data: datos,
            event
        };
        try {
            const resultado = await handleHttpRequest({
                method: subscriptions.method,
                uri: subscriptions.url,
                headers: subscriptions.headers,
                body: data,
                json: true,
                timeout: 10000,
            });
            return resultado;
        } catch (error) {
            notificacionesEncuestaLog.error('send:error', data, error, userScheduler);
            return null;
        }
    } else {
        notificacionesEncuestaLog.error('send:not-event', event, { error: 'evento no encontrado' }, userScheduler);
        return null;
    }
}

async function timeOut() {
    let constante;
    const time = 10000;
    const key = 'waap-timeOut';
    try {
        constante = await Constantes.findOne({ key });
        return constante ? parseInt(constante.nombre, 10) : time;
    } catch (error) {
        log.error('timeOut()', { constante, key }, { error: error.message }, userScheduler);
        return time;
    }
}

export = run;
