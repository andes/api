import { EventCore } from '@andes/event-bus';
import { AppCache } from '../../../connections';
import { Types } from 'mongoose';
import { logPaciente } from '../../../core/log/schemas/logPaciente';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { updatePrestacionPatient } from './../../../modules/rup/controllers/prestacion';
import { findById, linkPacientesDuplicados, updateGeoreferencia } from './paciente.controller';
import { IPacienteDoc } from './paciente.interface';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { CamaEstados } from '../../../modules/rup/internacion/cama-estados.schema';
import { Prestacion } from '../../../modules/rup/schemas/prestacion';
import { InternacionResumen } from '../../../modules/rup/internacion/resumen/internacion-resumen.schema';

// TODO: Handlear errores
EventCore.on('mpi:pacientes:create', async (paciente: IPacienteDoc) => {
    if (paciente.estado === 'validado') {
        const patientRequest = {
            user: paciente.createdBy,
            ip: 'localhost',
            connection: {
                localAddress: ''
            },
            body: paciente
        };
        if (paciente.direccion?.length) {
            await updateGeoreferencia(paciente);
        }
        await linkPacientesDuplicados(patientRequest, paciente);
        // si el paciente tiene algun reporte de error, verificamos que sea nuevo
        if (paciente.reportarError) {
            LoggerPaciente.logReporteError(patientRequest, 'error:reportar', paciente, paciente.notaError);
        }
    }
});

EventCore.on('mpi:pacientes:update', async (paciente: any, changeFields: string[]) => {
    const patientRequest = {
        user: paciente.updatedBy,
        ip: 'localhost',
        connection: {
            localAddress: ''
        },
        body: paciente
    };
    const direccionOriginal = paciente._original.direccion?.[0] || null;
    const direccionActual = paciente.direccion?.[0] || null;
    // Verifica si hubo algun cambio en direccion, localidad y/o provincia
    if (addressChanged(direccionOriginal, direccionActual)) {
        await updateGeoreferencia(paciente);
    }
    // Verifica si se realizó alguna operación de vinculación de pacientes
    const vinculado = changeFields.includes('idPacientePrincipal');
    if (vinculado && paciente.idPacientePrincipal) {
        AppCache.clear(`huds-${paciente.idPacientePrincipal}`);
        AppCache.clear(`huds-${paciente.id}`);
        setTimeout(() => {
            EventCore.emitAsync('mpi:pacientes:link', {
                target: new Types.ObjectId(paciente.idPacientePrincipal),
                source: new Types.ObjectId(paciente.id)
            });
        }, 10000);
        const pacienteVinculado = await findById(paciente.idPacientePrincipal);
        await updatePrestacionPatient(pacienteVinculado, paciente.id, paciente.idPacientePrincipal);
    }
    if (vinculado && paciente.idPacientePrincipal === null && paciente.activo) {
        AppCache.clear(`huds-${paciente._original.idPacientePrincipal}`);
        AppCache.clear(`huds-${paciente.id}`);
        setTimeout(() => {
            EventCore.emitAsync('mpi:pacientes:unlink', {
                target: new Types.ObjectId(paciente._original.idPacientePrincipal),
                source: new Types.ObjectId(paciente.id)
            });
        }, 10000);
        await updatePrestacionPatient(paciente, paciente.id, null);
    }
    if (paciente.estado === 'validado') {
        // si el paciente tiene algun reporte de error, verificamos que sea nuevo
        if (paciente.reportarError) {
            const reportes = await logPaciente.find({ paciente: paciente.id, operacion: 'error:reportar' });
            if (!reportes.some((rep: any) => rep.error === paciente.notaError)) {
                LoggerPaciente.logReporteError(patientRequest, 'error:reportar', paciente, paciente.notaError);
            }
        }
    }
    if (changeFields.includes('activo')) {
        // Obtenemos todos los pacientes relacionados del paciente desactivado/activado en un array de promesas.
        let relacionados = paciente.relaciones.map(r => Paciente.findById(r.referencia));
        relacionados = await Promise.all(relacionados);
        // Por cada uno de esos pacientes relacionados buscamos en que posición del array de relaciones del paciente desactivado/activado
        // se encuentra y luego cambiamos el atributo activo a true/false segun corresponde.
        relacionados.map(async pac => {
            const index = pac.relaciones.findIndex(rel => rel.referencia.toString() === paciente._id.toString());
            if (index > -1) {
                pac.relaciones[index].activo = paciente.activo;
            }
            await Paciente.findByIdAndUpdate(pac._id, { relaciones: pac.relaciones });
        });
    }
    // Verifica si el paciente esta actualmente internado para replicar los cambios
    if (['nombre', 'apellido', 'sexo', 'alias', 'genero'].map(field => changeFields.includes(field))) {
        await checkAndUpdateInternacion(paciente);
    }
});


function addressChanged(addOld, newAdd) {
    const changeDir = addOld?.valor !== newAdd?.valor;
    const changeLoc = addOld?.ubicacion.localidad?.nombre !== newAdd?.ubicacion.localidad?.nombre;
    const changeProv = addOld?.ubicacion.provincia?.nombre !== newAdd?.ubicacion.provincia?.nombre;

    return changeDir || changeLoc || changeProv;
}

// Verifica si el paciente se encuentra internado y de ser asi actualiza sus datos basicos
async function checkAndUpdateInternacion(paciente) {
    let ultimoEstadoCapaMedica: any = await CamaEstados.findOne({
        idOrganizacion: Types.ObjectId(paciente.updatedBy.organizacion.id),
        capa: 'medica', // habitualmente se registra primero ingreso/egreso en capa medica
        'estados.paciente.id': paciente._id
    }).sort({ start: -1 });

    if (!ultimoEstadoCapaMedica) {
        // nunca internado
        return;
    }
    // ultima ocupación de cama del paciente (capa medica)
    ultimoEstadoCapaMedica = ultimoEstadoCapaMedica.toObject();

    const idInternacionMedica = ultimoEstadoCapaMedica.estados.find(e => {
        const id = e.paciente?.id ? (e.paciente?.id).toString() : '';
        return id === paciente.id;
    }).idInternacion;

    const ultimoEgresoCapaMedica = await CamaEstados.findOne({
        'estados.extras.idInternacion': idInternacionMedica
    });

    if (!ultimoEgresoCapaMedica) {
        // como el paciente no esta egresado, obtenemos capa estadistica para tambien actualizar sus datos..
        let ultimoEstadoEstadistica: any = await CamaEstados.findOne({
            idOrganizacion: Types.ObjectId(paciente.updatedBy.organizacion.id),
            capa: 'estadistica',
            start: { $gte: ultimoEstadoCapaMedica.start },
            'estados.paciente.id': paciente._id
        }).sort({ start: -1 });

        // ultima ocupación de cama del paciente (capa estadistica)
        ultimoEstadoEstadistica = ultimoEstadoEstadistica?.toObject();

        const idInternacionEstadistica = ultimoEstadoEstadistica?.estados.find(e => {
            const id = e.paciente?.id ? (e.paciente?.id).toString() : '';
            return id === paciente.id;
        }).idInternacion;

        const pac = {
            id: paciente._id,
            documento: paciente.documento,
            numeroIdentificacion: paciente.numeroIdentificacion,
            nombre: paciente.nombre,
            alias: paciente.alias,
            apellido: paciente.apellido,
            sexo: paciente.sexo,
            genero: paciente.genero,
            fechaNacimiento: paciente.fechaNacimiento
        };

        // actualizamos datos en capa medica
        await CamaEstados.update(
            {
                idOrganizacion: ultimoEstadoCapaMedica.idOrganizacion,
                ambito: 'internacion',
                capa: 'medica',
                'estados.idInternacion': idInternacionMedica
            },
            {
                $set: { 'estados.$[elemento].paciente': pac }
            },
            {
                arrayFilters: [{ 'elemento.paciente.id': paciente.id }],
                multi: true
            }
        );
        // actualizamos resumen de la internacion
        const resumenUpdated = await InternacionResumen.findByIdAndUpdate(idInternacionMedica, { paciente: pac });
        let idPrestacion; // id de la prestacion donde se encuentra el informe

        // si es necesario, actualizamos datos en capa estadistica
        if (idInternacionEstadistica) {
            if (idInternacionEstadistica !== idInternacionMedica) {
                /* si fuera mismo idInternacion significaria que el efector usa capas
                    fusionadas y solo habria que actualizar capa medica (No es el caso) */
                await CamaEstados.update(
                    {
                        idOrganizacion: ultimoEstadoCapaMedica.idOrganizacion,
                        ambito: 'internacion',
                        capa: 'estadistica',
                        'estados.idInternacion': idInternacionEstadistica
                    },
                    {
                        $set: { 'estados.$[elemento].paciente': pac }
                    },
                    {
                        arrayFilters: [{ 'elemento.paciente.id': paciente.id }],
                        multi: true
                    }
                );
                idPrestacion = idInternacionEstadistica;
            } else {
                idPrestacion = (resumenUpdated as any).idPrestacion;
            }
        }
        if (idPrestacion) {
            // actualizamos la prestacion donde se encuentra el informe (Necesario para el listado de internación)
            await Prestacion.findByIdAndUpdate(idInternacionEstadistica, { paciente: pac });
        }
    }
}
