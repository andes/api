// Script que actualiza keys de registros y genera registros de historial retroactivamente a partir de la fecha del primer histórico de prestación
// registrado.
import { Prestacion } from '../modules/rup/schemas/prestacion';
import moment = require('moment');
import * as turnosController from '../modules/turnos/controller/turnosController';

const descripciones = {
    creacion: 'Creada',
    citar: 'Paciente citado',
    rechazada: 'Contrarreferida',
    pendiente: 'Aceptada',
    referir: 'Referida',
    asignarTurno: 'Turno asignado',
    liberarTurno: 'Turno liberado',
    asignada: 'Profesional asignado',
    validada: 'Validada',
    ejecucion: 'Ejecutada',
    anulada: 'Anulada',
    indefinida: 'Modificada',
    devolver: 'Devuelta',
};

let fechaPrimerHistorial;

/**
 * Actualiza las keys del historial
 */
async function actualizarKeys() {
    /* eslint-disable no-console */

    console.log('INICIO actualizarKeys');
    const solicitudes = findSolicitudes().cursor({ batchSize: 200 });
    let i = 0;
    let prestacion;
    while (prestacion = await solicitudes.next()) {
        i++;
        if (i % 1000 === 0) {
            console.log(i);
        }
        let historial = prestacion.solicitud.historial;
        if (!historial) {
            historial = [];
        }
        // Reemplazamos los registros preexistentes con las key correctas
        historial.forEach((h) => {
            if (h.accion === 'asignacionProfesional') {
                h.accion = 'asignada';
            } else if (h.accion === 'responder') {
                h.accion = 'rechazada';
            } else if (h.accion === 'asignacionTurno') {
                h.accion = 'asignarTurno';
            } else if (h.accion === 'liberacionTurno') {
                h.accion = 'liberarTurno';
            } else if (h.accion === 'referencia') {
                h.accion = 'referir';
            }
            h.descripcion = descripciones[h.accion];
        });
        await Prestacion.update({ _id: prestacion._id }, { $set: { 'solicitud.historial': historial } });
    }
    console.log('FIN actualizarKeys');
}
/**
 * Genera registros de historial para eventos no registrados de creacion, asignacion,
 * contrarreferencia, ejecución y validación una solicitud de prestación
 */
async function updateHistorialPrestaciones() {
    console.log('INICIO updateHistorialPrestaciones');
    const solicitudes = findSolicitudes().cursor({ batchSize: 200 });
    let i = 0;
    let prestacion;
    while (prestacion = await solicitudes.next()) {

        i++;
        if (i % 1000 === 0) {
            console.log(i);
        }

        if (!prestacion.solicitud.historial) {
            prestacion.solicitud.historial = [];
        }

        const estados = [
            ...prestacion.estados.filter((e) => e.tipo === 'asignada'),
            ...prestacion.estados.filter((e) => e.tipo === 'rechazada'),
            ...prestacion.estados.filter((e) => e.tipo === 'anulada'),
            ...prestacion.estados.filter((e) => e.tipo === 'pendiente'),
        ];
        if (prestacion.solicitud.turno) {
            const resultado = await turnosController.getTurnoById(prestacion.solicitud.turno);
            const registro = {
                tipo: 'asignarTurno',
                observaciones: resultado.turno.nota,
                createdAt: resultado.turno.fechaHoraDacion ? resultado.turno.fechaHoraDacion : resultado.turno.updatedAt,
                createdBy: resultado.turno.usuarioDacion ? resultado.turno.usuarioDacion : resultado.turno.updatedBy

            };
            estados.push(registro);
        }
        const ejecucion = prestacion.estados.find((e) => e.tipo === 'ejecucion');
        if (ejecucion) {
            estados.push(ejecucion);
        }

        const validacion = prestacion.estados.find((e) => e.tipo === 'validada');
        if (validacion) {
            estados.push(validacion);
        }

        const crearRegistro = (estado) => {
            const reg: any = {
                organizacion: estado.createdBy.organizacion,
                accion: estado.tipo,
                createdAt: estado.createdAt,
                createdBy: estado.createdBy,
            };

            if (estado.observaciones) {
                reg.observaciones = estado.observaciones;
            }

            prestacion.solicitud.historial.push(reg);
        };

        // Si no existe, crea un registro de creación con el primer estado que exista
        if (!prestacion.solicitud.historial.length || !prestacion.solicitud.historial.find((e) => e.accion === 'creacion')) {
            crearRegistro({
                tipo: 'creacion',
                createdAt: prestacion.estados[0].createdAt,
                createdBy: prestacion.estados[0].createdBy,
            });
        }

        estados.forEach((e) => {
            if ((e.tipo === 'ejecucion' || e.tipo === 'validada') && !prestacion.solicitud.historial.find((h) => h.accion === e.tipo)) {
                crearRegistro(e);
            } else {// Buscamos un registro el historial que coincida con el tipo y fecha del estado
                if (!prestacion.solicitud.historial.find((h) =>
                    h.accion === e.tipo && moment(e.createdAt).seconds(0).milliseconds(0).isSame(moment(e.createdAt).seconds(0).milliseconds(0))
                )) { // Si no existe el registro, lo creamos
                    crearRegistro(e);
                }
            }
        });
        // Seteamos descripcion, si esta no existe
        prestacion.solicitud.historial.forEach((h) => (h.descripcion = h.descripcion ? h.descripcion : descripciones[h.accion]));
        // Ordenamos el historial final cronologicamente
        prestacion.solicitud.historial = prestacion.solicitud.historial.sort((a, b) => moment(b.createdAt).diff(moment(a.createdAt)));
        await Prestacion.update({ _id: prestacion._id }, { $set: { 'solicitud.historial': prestacion.solicitud.historial } });
    }
    console.log('FIN updateHistorialPrestaciones');
}

function findSolicitudes() { // busca las prestaciones desde la fecha correspondiente cuyo inicio sea top (solicitudes)
    const searchParams = {
        $and: [
            { createdAt: { $gt: fechaPrimerHistorial } },
            { inicio: 'top' }
        ],
    };
    return Prestacion.find(searchParams, { estados: 1, solicitud: 1 });
}

// Obtiene el primer registro en historial de solicitudes para traer la fecha desde la cual correr el script
async function ObtenerFechaInicioScript() {
    const prestaciones = await Prestacion.find({
        $and: [
            { 'solicitud.historial': { $exists: true } }, { 'solicitud.historial': { $ne: [] } }, { inicio: 'top' }
        ]
    }).sort({ createdAt: 1 }).limit(1);
    fechaPrimerHistorial = moment((prestaciones[0] as any).createdAt).startOf('day').toDate();
}

async function run(done) {
    await ObtenerFechaInicioScript();
    await actualizarKeys();
    await updateHistorialPrestaciones();
    done();
}

export = run;
