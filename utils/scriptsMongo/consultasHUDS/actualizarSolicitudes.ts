// [REVISAR]
import { Connections } from '../../../connections';
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

const Prestacion = require('../../../modules/rup/schemas/prestacion').model;

Connections.initialize();

// Instanciamos un cursor
const cursor = Prestacion.findOne().cursor();

cursor.on('close', () => { // Si no encuentra nada, termina el script.
    process.exit();
});

cursor.on('data', async (prestacion: any) => {

    // No hay Organización destino?
    // if (typeof prestacion.solicitud.organizacionDestino === 'undefined') {
    if (prestacion.ejecucion.registros && prestacion.ejecucion.registros.createdBy) {
        prestacion.solicitud.organizacionDestino = prestacion.ejecucion.registros.createdBy.organizacion;
    } else {
        prestacion.solicitud.organizacionDestino = prestacion.createdBy.organizacion;
    }
    // }

    // No hay Profesional(es) destino?
    // if (typeof prestacion.solicitud.profesionalesDestino === 'undefined') {
    if (prestacion.solicitud.registros.valor && prestacion.solicitud.registros.valor.solicituPrestacion && prestacion.solicitud.registros.valor.solicituPrestacion.profesionales) {
        prestacion.solicitud.profesionalesDestino = prestacion.solicitud.registros.valor.solicituPrestacion.profesionales;
    } else {
        prestacion.solicitud.profesionalesDestino = [prestacion.solicitud.profesional];
    }
    // }

    // console.log('organizacionDestino:   ', prestacion.solicitud.organizacionDestino.nombre);
    // console.log('profesionalesDestino:  ', prestacion.solicitud.profesionalesDestino[0].nombre + ' ' + prestacion.solicitud.profesionalesDestino[0].apellido);

    // ** IMPORTANTE ** Descomentar las siguientes 2 líneas para habilitar la ejecución de este script
    // Auth.audit(prestacion, (configuraciones.userUpdater as any));
    // await prestacion.save();

});
