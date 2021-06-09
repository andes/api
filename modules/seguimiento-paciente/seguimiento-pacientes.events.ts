import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../config.private';
import { ISeguimientoPaciente } from './interfaces/seguimiento-paciente.interface';
import { SeguimientoPaciente } from './schemas/seguimiento-paciente.schema';
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


EventCore.on('epidemiologia:prestaciones:validate', async (data) => {
    try {
        const seguimientos = await SeguimientoPaciente.find({ 'paciente.id': data.paciente.id }).sort({ createdAt: -1 });
        if (seguimientos) {
            const lastSeguimiento = seguimientos[0];
            const prestacion = {
                idPrestacion: data._id,
                tipoPrestacion: data.solicitud.tipoPrestacion.term,
                fecha: data.createdAt
            };
            lastSeguimiento.llamados.push(prestacion);
            lastSeguimiento.ultimoEstado = { clave: 'seguimiento', valor: prestacion.fecha };
            return await SeguimientoPacienteCtr.update(lastSeguimiento.id, lastSeguimiento, dataLog);
        }
    } catch (err) {
        return err;
    }
});

