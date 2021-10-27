import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../config.private';
import { getOrganizacionAreaByLocationPoint } from './../georeferencia/controller/areasPrograma';
import { ISeguimientoPaciente } from './interfaces/seguimiento-paciente.interface';
import { Organizacion } from '../../core/tm/schemas/organizacion';
import { SeguimientoPaciente } from './schemas/seguimiento-paciente.schema';
import { SeguimientoPacienteCtr } from './seguimiento-paciente.route';
import moment = require('moment');
import { Prestacion } from '../rup/schemas/prestacion';
import { InternacionResumen } from '../rup/internacion/resumen/internacion-resumen.schema';

const dataLog: any = new Object(userScheduler);
const altaCid = '201000246105';

function moreThan14Days(seguimientos) {
    const ultimoSeguimiento = seguimientos.sort((a, b) => b.fechaInicio - a.fechaInicio)[0];
    return moment().diff(ultimoSeguimiento.fechaInicio, 'days') >= 14 ? true : false;
}

EventCore.on('epidemiologia:seguimiento:create', async (data) => {
    try {
        const seguimientos = await SeguimientoPaciente.find({ 'paciente.id': data.paciente.id });
        if (seguimientos.length <= 0 || (seguimientos.length > 0 && moreThan14Days(seguimientos))) {
            const mpiSections = data.secciones.find(s => s.name === 'Mpi');
            const contactosEstrechos = data.secciones.find(s => s.name === 'Contactos Estrechos');

            const patientGeoRef = (data.paciente.direccion && data.paciente.direccion[0]?.geoReferencia?.length) ? data.paciente.direccion[0].geoReferencia.reverse() : null;

            let coordinates;
            let organizacionSeguimiento;

            if (patientGeoRef) {
                coordinates = patientGeoRef;
            } else {
                const organizacionCreatedBy = await Organizacion.findById(data.createdBy.organizacion.id);
                if (organizacionCreatedBy.configuraciones?.organizacionSeguimiento) {
                    organizacionSeguimiento = organizacionCreatedBy.configuraciones.organizacionSeguimiento;
                } else {
                    coordinates = organizacionCreatedBy.direccion?.geoReferencia?.reverse();
                }
            }

            if (!organizacionSeguimiento) {
                if (coordinates) {
                    organizacionSeguimiento = await getOrganizacionAreaByLocationPoint({ type: 'Point', coordinates });
                } else {
                    const organizacionDefecto = await Organizacion.findOne({ defaultSeguimiento: true });
                    organizacionSeguimiento = {
                        id: organizacionDefecto._id,
                        nombre: organizacionDefecto.nombre,
                        codigoSisa: organizacionDefecto.codigo.sisa.toString()
                    };
                }
            }

            const seguimiento: ISeguimientoPaciente = {
                fechaInicio: new Date(),
                origen: {
                    id: data.id, // id de la ficha a la que hace referencia
                    nombre: 'Ficha de epidemiología',
                    tipo: data.type.name // Esto es variable por si algún día viene la de hanta, etc.
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
    } catch (err) {
        return err;
    }
});


EventCore.on('epidemiologia:prestaciones:romperValidacion', async (data) => {
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
