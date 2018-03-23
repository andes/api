import { Matching } from '@andes/match';
import { model as Prestacion } from '../../../modules/rup/schemas/prestacion';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';
import * as configuraciones from './../../../config.private';

/**
 *  Sobre este script:
 *  - Antes de ejecutarlo hay que descomentar las líneas bajo el texto "IMPORTANTE"
 *  - Se ejecuta sobre una base de datos "andes" colección "prestaciones"
 *  - Actualiza todas las Prestaciones "antiguas" que no tengan presente estos datos:
 *      1. solicitud.organizacionDestino
 *      2. solicitud.profesionalesDestino
 *
 *  En caso de encontrarse esos datos, se actualizan los registros de esta manera:
 *      a.  organizacionDestino: Si no existe se completa con una copia de ejecucion.registros.createdBy.organizacion.
 *          Si no hay registros se completa con createdBy.organizacion
 *
 *      b.  profesionalesDestino: Si no existe se completa con una copia de solicitud.registros.valor.solicituPrestacion.profesionales.
 *          Si no hay registros se completa con solicitud.profesional
 */

let conn = mongoose.connect(configuraciones.hosts.mongoDB_main.host, {
    auth: configuraciones.hosts.mongoDB_main.auth,
    server: configuraciones.hosts.mongoDB_main.server
}).connection;

// Ya está abierta?
conn.once('open', () => {

    // console.log('Conectado.');

    // Instanciamos un cursor
    let cursor = Prestacion.findOne().cursor();

    cursor.on('close', function () { // Si no encuentra nada, termina el script.
        // console.log('Fin.');
        conn.close();
    });

    cursor.on('data', async (prestacion: any) => {

        /******* SCRIPT CANCELADO *******/

        // No hay Organización Origen?
        // if (typeof prestacion.solicitud.organizacionOrigen === 'undefined') {
        // if (prestacion.ejecucion.registros && prestacion.ejecucion.registros.createdBy) {
        //     prestacion.solicitud.organizacionOrigen = prestacion.ejecucion.registros.createdBy.organizacion;
        // } else {
        //     prestacion.solicitud.organizacionOrigen = prestacion.createdBy.organizacion;
        // }
        // // }

        // // No hay Profesional(es) Origen?
        // // if (typeof prestacion.solicitud.profesionalOrigen === 'undefined') {
        // if (prestacion.solicitud.registros.valor && prestacion.solicitud.registros.find(x => { x.valor.solicitudPrestacion && x.valor.solicituPrestacion.profesionales })) {
        //     prestacion.solicitud.profesionalOrigen = prestacion.solicitud.registros.find(x => x.valor.solicitudPrestacion && x.valor.solicituPrestacion.profesionales);
        // } else {
        //     prestacion.solicitud.profesionalOrigen = prestacion.solicitud.profesional;
        // }
        // // }

        // console.log('organizacionOrigen:   ', prestacion.solicitud.organizacionOrigen.nombre);
        // console.log('profesionalOrigen:  ', prestacion.solicitud.profesionalOrigen.nombre + ' ' + prestacion.solicitud.profesionalOrigen.apellido);

        // ** IMPORTANTE ** Descomentar las siguientes 2 líneas para habilitar la ejecución de este script
        // Auth.audit(prestacion, (configuraciones.userUpdater as any));
        // await prestacion.save();

    });

});
