import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../config.private';
import { ISeguimientoPaciente } from './interfaces/seguimiento-paciente.interface';
import { SeguimientoPacienteCtr } from './seguimiento-paciente.route';
import moment = require('moment');

let dataLog: any = new Object(userScheduler);


function moreThan14Days(seguimientos) {
    const ultimoSeguimiento = seguimientos.sort((a, b) => b.fechaInicio - a.fechaInicio)[0];
    return moment().diff(ultimoSeguimiento.fechaInicio, 'days') >= 14 ? true : false;
}

EventCore.on('epidemiologia:seguimiento:create', async (data) => {
    try {
        const seguimientos = await SeguimientoPacienteCtr.search({ 'paciente.id': data.paciente.id });
        if (seguimientos.length <= 0 || (seguimientos.length > 0 && moreThan14Days(seguimientos))) {
            const mpiSections = data.secciones.find(s => s.name === 'Mpi');
            const contactosEstrechos = data.secciones.find(s => s.name === 'Contactos Estrechos');
            const seguimiento: ISeguimientoPaciente = {
                fechaInicio: new Date(),
                origen: {
                    id: data.id, // id de la ficha a la que hace referencia
                    nombre: 'Ficha de epidemiología',
                    tipo: data.type.name   // Esto es variable por si algún día viene la de hanta, etc.
                },
                score: {
                    value: parseInt(data.score.value, 10),
                    fecha: data.score.fecha
                },
                paciente: {
                    id: data.paciente.id,
                    nombre: data.paciente.nombre,
                    apellido: data.paciente.apellido,
                    documento: data.paciente.documento,
                    telefonoActual: mpiSections.fields.find(f => f.telefonocaso).telefonocaso,
                    direccionActual: mpiSections.fields.find(f => f.direccioncaso).direccioncaso,
                    sexo: data.paciente.sexo,
                    foto: '',
                    // foto: data.paciente.foto ? data.paciente.foto : null, // Evaluar si queremos la foto
                    fechaNacimiento: data.paciente.fechaNacimiento
                },
                llamados: [],
                ultimoEstado: {
                    clave: 'pendiente',
                    valor: new Date()
                },
                contactosEstrechos: contactosEstrechos ? [...contactosEstrechos.fields] : []
            };
            await SeguimientoPacienteCtr.create(seguimiento, dataLog as any);
        }
    } catch (err) {
        return err;
    }

});


// Ver el tema de la actualización con el evento de la prestación!!!

// EventCore.on('epidemiologia:prestaciones:validate', async (info) => {
//     const fichas = await FormEpidemiologiaCtr.search({ paciente: info.paciente.id, type: 'covid19' });
//     if (fichas) {
//         const fichasOrdenadas = fichas.sort((a, b) => b.createdAt - a.createdAt);
//         const lastFicha = fichasOrdenadas[0];
//         const secciones = lastFicha.secciones;
//         let seccionOperaciones = secciones.find(seccion => seccion.name === 'Operaciones');
//         if (!seccionOperaciones) {
//             seccionOperaciones = {
//                 name: 'Operaciones',
//                 fields: [{
//                     seguimiento: {
//                         llamados: [],
//                         ultimoEstado: {}
//                     }
//                 }]
//             };
//             secciones.push(seccionOperaciones);
//         }
//         let fieldSeguimiento = seccionOperaciones.fields.find(f => f.seguimiento);
//         if (!fieldSeguimiento) {
//             fieldSeguimiento = {
//                 seguimiento: {
//                     llamados: [],
//                     ultimoEstado: {}
//                 }
//             };
//             seccionOperaciones.fields.push(fieldSeguimiento);
//         }
//         const prestacion = {
//             idPrestacion: info._id,
//             tipoPrestacion: info.solicitud.tipoPrestacion.term,
//             fecha: info.createdAt
//         };
//         fieldSeguimiento.seguimiento.llamados.push(prestacion);
//         fieldSeguimiento.seguimiento.ultimoEstado = { key: 'seguimiento', value: prestacion.fecha };
//         return await FormEpidemiologiaCtr.update(lastFicha.id, { secciones }, dataLog);
//     }
// });

