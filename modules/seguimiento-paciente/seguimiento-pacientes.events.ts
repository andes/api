import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../config.private';
import { ISeguimientoPaciente } from './interfaces/seguimiento-paciente.interface';
import { SeguimientoPaciente } from './schemas/seguimiento-paciente.schema';
import { SeguimientoPacienteCtr } from './seguimiento-paciente.route';
import moment = require('moment');
import { Prestacion } from '../rup/schemas/prestacion';
import { InternacionResumen } from '../rup/internacion/resumen/internacion-resumen.schema';
import { getOrganizacionSeguimiento } from './controller/seguimiento-paciente.controller';
import { getScoreValue } from './../../modules/forms/forms-epidemiologia/controller/forms-epidemiologia.controller';
import { SECCION_CONTACTOS_ESTRECHOS, SECCION_MPI } from '../../modules/forms/forms-epidemiologia/constantes';
import { FormsEpidemiologia } from '../forms/forms-epidemiologia/forms-epidemiologia-schema';

const dataLog: any = new Object(userScheduler);

function moreThan14Days(seguimientos, data) {
    const ultimoSeguimiento = seguimientos.sort((a, b) => b.fechaInicio - a.fechaInicio)[0];
    return moment(data.createdAt).diff(ultimoSeguimiento.fechaInicio, 'days') >= 14 ? true : false;
}

EventCore.on('epidemiologia:seguimiento:create', async (data) => {
    try {
        const seguimientos = await SeguimientoPaciente.find({ 'paciente.id': data.paciente.id });
        if (seguimientos.length <= 0 || (seguimientos.length > 0 && moreThan14Days(seguimientos, data))) {
            const mpiSections = data.secciones.find(s => s.name === SECCION_MPI);
            const contactosEstrechos = data.secciones.find(s => s.name === SECCION_CONTACTOS_ESTRECHOS);
            const organizacionSeguimiento = await getOrganizacionSeguimiento(data);
            const scoreValue = await getScoreValue(data);
            const score = {
                value: scoreValue,
                fecha: new Date()
            };

            const seguimiento: ISeguimientoPaciente = {
                fechaInicio: new Date(),
                origen: {
                    id: data.id, // id de la ficha a la que hace referencia
                    nombre: 'Ficha de epidemiología',
                    tipo: data.type.name // Esto es variable por si algún día viene la de hanta, etc.
                },
                score,
                paciente: {
                    id: data.paciente.id,
                    nombre: data.paciente.nombre,
                    alias: data.paciente.alias || undefined,
                    apellido: data.paciente.apellido,
                    documento: data.paciente.documento,
                    numeroIdentificaion: data.paciente.numeroIdentificaion || undefined,
                    telefonoActual: mpiSections.fields.find(f => f.telefonocaso).telefonocaso,
                    direccionActual: mpiSections.fields.find(f => f.direccioncaso).direccioncaso,
                    sexo: data.paciente.sexo,
                    genero: data.paciente.genero,
                    foto: '',
                    fechaNacimiento: data.paciente.fechaNacimiento
                },
                organizacionSeguimiento,
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
    if (!data.paciente) {
        return;
    }
    try {
        const fichaPaciente = await FormsEpidemiologia.findOne({ 'paciente.id': data.paciente.id }).sort({ createdAt: -1 });
        if (checkFecha(fichaPaciente, data.updatedAt)) {
            const altaCid = '201000246105';
            const lastSeguimiento = await SeguimientoPaciente.findOne({ 'paciente.id': data.paciente.id }).sort({ createdAt: -1 });
            if (lastSeguimiento) {
                const pacienteAlta = data.ejecucion.registros.some(registro => registro.concepto.conceptId === altaCid);
                const prestacion = {
                    idPrestacion: data._id,
                    tipoPrestacion: data.solicitud.tipoPrestacion.term,
                    fecha: data.createdAt
                };
                if (pacienteAlta) {
                    lastSeguimiento.ultimoEstado = { clave: 'alta', valor: prestacion.fecha };
                } else {
                    lastSeguimiento.ultimoEstado = { clave: 'seguimiento', valor: prestacion.fecha };
                }
                lastSeguimiento.llamados.push(prestacion);
                return await SeguimientoPacienteCtr.update(lastSeguimiento.id, lastSeguimiento, dataLog);
            }
        }
    } catch (err) {
        return err;
    }
});


EventCore.on('epidemiologia:prestaciones:romperValidacion', async (data) => {
    try {
        if (!data.paciente) {
            return;
        }
        const lastSeguimiento: any = await SeguimientoPaciente.findOne({ 'paciente.id': data.paciente.id }).sort({ createdAt: -1 });
        if (lastSeguimiento) {
            const indexPrestacion = lastSeguimiento.llamados.findIndex(field => field.idPrestacion.toString() === data._id.toString());
            if (indexPrestacion !== -1 || lastSeguimiento.ultimoEstado.idPrestacion.toString() === data._id.toString()) {
                if (indexPrestacion !== -1) {
                    lastSeguimiento.llamados.splice(indexPrestacion, 1);
                }
                const longitud = lastSeguimiento.llamados.length;
                if (!longitud) {
                    lastSeguimiento.ultimoEstado = { clave: 'pendiente', valor: data.createdAt };
                } else {
                    const ultimaPrestacion = lastSeguimiento.llamados[longitud - 1];
                    lastSeguimiento.ultimoEstado = { clave: 'seguimiento', valor: ultimaPrestacion.fecha };
                }
                return await SeguimientoPacienteCtr.update(lastSeguimiento.id, lastSeguimiento, dataLog);
            }
        }
    } catch (error) {
        return error;
    }
});

EventCore.on('rup:paciente:fallecido', async (data) => {
    try {
        const lastSeguimiento = await SeguimientoPaciente.findOne({ 'paciente.id': data.prestacion.paciente.id }).sort({ createdAt: -1 });
        if (lastSeguimiento) {
            const prestacion = {
                idPrestacion: data.prestacion._id,
                tipoPrestacion: data.prestacion.solicitud.tipoPrestacion.term,
                fecha: data.prestacion.createdAt
            };
            lastSeguimiento.ultimoEstado = { clave: 'fallecido', valor: prestacion.fecha };
            lastSeguimiento.llamados.push(prestacion);
            return await SeguimientoPacienteCtr.update(lastSeguimiento.id, lastSeguimiento, dataLog);
        }
    } catch (err) {
        return err;
    }
});

EventCore.on('mapa-camas:paciente:ingreso', async (estado) => {
    try {
        const lastSeguimiento = await SeguimientoPaciente.findOne({ 'paciente.id': estado.paciente.id }).sort({ createdAt: -1 });
        if (lastSeguimiento) {
            return await SeguimientoPacienteCtr.update(lastSeguimiento.id, { internacion: true }, dataLog);
        }
    } catch (err) {
        return err;
    }
});

EventCore.on('mapa-camas:paciente:egreso', async (estado) => {
    let idPaciente;
    if (estado.extras?.idInternacion) {
        if (estado.capa === 'estadistica') {
            const prestacion: any = await Prestacion.findById(estado.extras.idInternacion);
            idPaciente = prestacion.paciente.id;
        } else if (estado.capa === 'medica') {
            const resumen = await InternacionResumen.findById(estado.extras.idInternacion);
            idPaciente = resumen.paciente.id;
        }
        try {
            const lastSeguimiento = await SeguimientoPaciente.findOne({ 'paciente.id': idPaciente }).sort({ createdAt: -1 });
            if (lastSeguimiento) {
                return await SeguimientoPacienteCtr.update(lastSeguimiento.id, { internacion: false }, dataLog);
            }
        } catch (err) {
            return err;
        }
    }
});

EventCore.on('rup:paciente:internadoValidacion', async (data) => {
    try {
        const lastSeguimiento: ISeguimientoPaciente = await SeguimientoPaciente.findOne({ 'paciente.id': data.prestacion.paciente.id });
        if (lastSeguimiento) {
            return await SeguimientoPacienteCtr.update(lastSeguimiento.id, { internacion: true }, dataLog);
        }
    } catch (error) {
        return error;
    }
});

EventCore.on('rup:paciente:internadoRomperValidacion', async (data) => {
    try {
        const lastSeguimiento: ISeguimientoPaciente = await SeguimientoPaciente.findOne({ 'paciente.id': data.prestacion.paciente.id });
        if (lastSeguimiento?.internacion) {
            return await SeguimientoPacienteCtr.update(lastSeguimiento.id, { internacion: false }, dataLog);
        }
    } catch (error) {
        return error;
    }
});
/**
 * Función para que no se registre como seguimiento la prestacion que se carga desde la ficha,
 * se asume que si la prestación se registro a 1 hora de haber creado la ficha no es de seguimiento
 * (Por ahora es la solución que se encontró)
 */

const checkFecha = (ficha, horaPrestacion: Date) => {
    const fichaDate = ficha.updatedAt ? ficha.updatedAt : ficha.createdAt;
    const dif = moment(horaPrestacion).diff(moment(fichaDate), 'hours');
    return dif >= 1;
};
