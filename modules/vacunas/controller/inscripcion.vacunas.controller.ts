import * as moment from 'moment';
import { GrupoPoblacionalCtr } from './../../../core/tm/grupo-poblacional.routes';
import { PacienteCtr, replaceChars } from './../../../core-v2/mpi';
import { InscripcionVacunasCtr } from '../inscripcion-vacunas.routes';

export interface IEstadoInscripcion {
    titulo: String;
    subtitulo: String;
    body: String;
    status: String;
}

export async function mensajeEstadoInscripcion(documento: String, sexo: String) {
    const inscripto = await InscripcionVacunasCtr.findOne({
        documento,
        sexo
    });
    let estadoInscripcion: IEstadoInscripcion = { titulo: '', subtitulo: '', body: '', status: 'warning' };
    if (!inscripto) {
        estadoInscripcion.titulo = `Inscripción inexistente`;
        estadoInscripcion.subtitulo = `Su inscripción no se encuentra registrada`;
        estadoInscripcion.body = `Usted realizó la búsqueda con el documento ${documento} - ${sexo},
        Si desea inscribirse dirijase a la página del Ministerio de Salud de Neuquén `;
        estadoInscripcion.status = 'fail';
    } else {
        const grupo = await GrupoPoblacionalCtr.findOne({ nombre: inscripto.grupo.nombre });
        if (inscripto.fechaVacunacion) {
            estadoInscripcion.subtitulo = 'Su inscripción para la vacunación ha sido finalizada';
            estadoInscripcion.body = `Usted posee un registro de aplicación de la vacuna con fecha ${moment(inscripto.fechaVacunacion).format('DD/MM/YYYY')}`;
            estadoInscripcion.status = 'success';
        } else {
            if (inscripto.validado) {
                for (const validacion of grupo.validaciones) {
                    estadoInscripcion = await verificarEstadoInscripcion(inscripto, validacion);
                }
            } else {
                estadoInscripcion.subtitulo = 'Su inscripción para la vacunación se encuentra vigente';
                estadoInscripcion.body = `Usted se encuentra en proceso de validación. Con los
                siguientes datos ${inscripto.nombre} ${inscripto.apellido}, fecha de Nacimiento ${moment(inscripto.fechaNacimiento).format('DD/MM/YYYY')}`;
                estadoInscripcion.status = 'warning';
            }
        }
        if (!grupo.mensajeDefault && estadoInscripcion.body === '') {
            estadoInscripcion.subtitulo = 'Su inscripción para la vacunación se encuentra habilitada';
            estadoInscripcion.body = `Usted se encuentra habilitado para recibir la vacuna,
            el turno será asignado cuando tengamos disponibilidad efectiva de dosis`;
            estadoInscripcion.status = 'success';
        } else {
            if (grupo.mensajeDefault) {
                estadoInscripcion = grupo.mensajeDefault;
            }
        }
        estadoInscripcion.titulo = `Grupo: ${grupo.descripcion}`;
    }
    return estadoInscripcion;
}

export async function verificarEstadoInscripcion(inscripcion, validacion) {
    switch (validacion.type) {
        case 'domicilio':
            return await verificarDomicilioInscripcion(inscripcion, validacion);
        case 'personal_salud':
            return await verificarPersonalSalud(inscripcion, validacion);
    }
    return { titulo: '', subtitulo: '', body: '', status: 'warning' };
}

async function verificarDomicilioInscripcion(inscripcion, validacion) {
    try {
        const estado: IEstadoInscripcion = {
            titulo: '',
            subtitulo: 'Su inscripción para la vacunación se encuentra vigente',
            body: `Usted se encuentra en proceso de validación. Con los
        siguientes datos ${inscripcion.nombre} ${inscripcion.apellido}, fecha de Nacimiento ${moment(inscripcion.fechaNacimiento).format('DD/MM/YYYY')}`,
            status: 'warning'
        };
        if ((inscripcion.validaciones.length === 0) || (inscripcion.validaciones.length > 0 && inscripcion.validaciones[0] !== 'domicilio')) {
            // se verifica el domicilio del paciente
            if (inscripcion.paciente && inscripcion.paciente.id) {
                const paciente = await PacienteCtr.findById(inscripcion.paciente.id);
                const domicilio = paciente.direccion.find(dir => dir.ubicacion.provincia.nombre && replaceChars(dir.ubicacion.provincia.nombre as any).toLowerCase() === validacion.provincia);
                if (!domicilio) {
                    return validacion.mensajeError;
                }
            } else {
                return estado;
            }
        }
        return { titulo: '', subtitulo: '', body: '', status: 'warning' };
    } catch (err) {
        return err;
    }
}

async function verificarPersonalSalud(inscripcion, validacion) {
    try {
        if (!inscripcion[validacion.type]) {
            // se verifica el personal de salud
            return validacion.mensajeError;
        }
    } catch (err) {
        return err;
    }
}
