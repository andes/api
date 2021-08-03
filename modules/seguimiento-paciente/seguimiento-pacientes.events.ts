import { EventCore } from '@andes/event-bus';
import { defaultPointReference, userScheduler } from '../../config.private';
import { getOrganizacionAreaByLocationPoint } from './../georeferencia/controller/areasPrograma';
import { ISeguimientoPaciente } from './interfaces/seguimiento-paciente.interface';
import { SeguimientoPaciente } from './schemas/seguimiento-paciente.schema';
import { SeguimientoPacienteCtr } from './seguimiento-paciente.route';
import { calcularScore } from '../../modules/forms/forms-epidemiologia/controller/forms-epidemiologia.controller';

const dataLog: any = new Object(userScheduler);

EventCore.on('epidemiologia:seguimiento:create', async (data) => {
    try {
        const mpiSections = data.secciones.find(s => s.name === 'Mpi');
        const contactosEstrechos = data.secciones.find(s => s.name === 'Contactos Estrechos');
        const patientGeoRef = (data.paciente.direccion && data.paciente.direccion[0].geoReferencia?.length) ? data.paciente.direccion[0].geoReferencia.reverse() : defaultPointReference; // default reference
        const location = {
            type: 'Point',
            coordinates: [...patientGeoRef]
        };

        const score: any = calcularScore(data);

        const organizacionSeguimiento = await getOrganizacionAreaByLocationPoint(location);
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
                apellido: data.paciente.apellidolocation,
                documento: data.paciente.documento,
                telefonoActual: mpiSections.fields.find(f => f.telefonocaso).telefonocaso,
                direccionActual: mpiSections.fields.find(f => f.direccioncaso).direccioncaso,
                sexo: data.paciente.sexo,
                foto: '',
                location,
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
