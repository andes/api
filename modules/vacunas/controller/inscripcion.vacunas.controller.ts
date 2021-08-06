import * as moment from 'moment';
import { mpi } from '../../../config';
import { provincia as provinciaActual, userScheduler } from '../../../config.private';
import { extractFoto, findOrCreate, matching, updateContacto } from '../../../core-v2/mpi/paciente/paciente.controller';
import { validar } from '../../../core-v2/mpi/validacion';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { PersonalSaludCtr } from '../../../modules/personalSalud';
import { Prestacion } from '../../../modules/rup/schemas/prestacion';
import { services } from '../../../services';
import { InscripcionVacunasCtr } from '../inscripcion-vacunas.routes';
import { PacienteCtr, replaceChars } from './../../../core-v2/mpi';
import { GrupoPoblacionalCtr } from './../../../core/tm/grupo-poblacional.routes';

export interface IEstadoInscripcion {
    titulo: String;
    subtitulo: String;
    body: String;
    status: String;
    inscripto?: {
        nombre: String;
        apellido: String;
        documento: String;
        sexo: String;
        fechaNacimiento: Date;
        localidad: any;
        factorRiesgoEdad: boolean;
    };
}

export async function mensajeEstadoInscripcion(documento: String, sexo: String) {
    const inscripto = await InscripcionVacunasCtr.findOne({
        documento,
        sexo
    }, { sort: '-fechaRegistro' });
    let estadoInscripcion: IEstadoInscripcion = { titulo: '', subtitulo: '', body: '', status: 'warning' };
    if (!inscripto) {
        estadoInscripcion.titulo = 'Inscripción inexistente';
        estadoInscripcion.subtitulo = 'Su inscripción no se encuentra registrada';
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
            if (inscripto.estado === 'inhabilitado') {
                estadoInscripcion.subtitulo = 'Su inscripción para la vacunación no ha sido posible';
                estadoInscripcion.body = `Si usted considera que este mensaje es erróneo,
                por favor envie un email a inscripcionvacuna@neuquen.gov.ar `;
                estadoInscripcion.status = 'fail';
            } else {
                if (inscripto.validado) {
                    for (const validacion of grupo.validaciones) {
                        estadoInscripcion = await verificarEstadoInscripcion(inscripto, validacion);
                    }
                } else {
                    estadoInscripcion.subtitulo = 'Su inscripción para la vacunación se encuentra vigente';
                    estadoInscripcion.body = 'Usted se encuentra en proceso de validación.';
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
                    if (estadoInscripcion.subtitulo === '') {
                        estadoInscripcion.subtitulo = grupo.mensajeDefault.subtitulo;
                    }
                    estadoInscripcion.body = grupo.mensajeDefault.body;
                    estadoInscripcion.status = 'warning';
                }
            }
        }
        estadoInscripcion.titulo = `Grupo: ${grupo.descripcion}`;
        estadoInscripcion.inscripto = {
            nombre: inscripto.nombre,
            apellido: inscripto.apellido,
            documento: inscripto.documento,
            sexo: inscripto.sexo,
            fechaNacimiento: inscripto.fechaNacimiento,
            localidad: inscripto.localidad,
            factorRiesgoEdad: inscripto.factorRiesgoEdad
        };
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
                const domicilio = paciente.direccion.find(dir => dir.ubicacion.provincia?.nombre && replaceChars(dir.ubicacion.provincia?.nombre as any).toLowerCase() === validacion.provincia);
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
        return { titulo: '', subtitulo: '', body: '', status: 'warning' };
    } catch (err) {
        return err;
    }
}

export async function validarDomicilio(inscripcion) {
    try {
        const provincia = provinciaActual || 'neuquen';
        let domicilio = null;
        // se verifica el domicilio del paciente asociado a la inscripción
        if (inscripcion.paciente && inscripcion.paciente.id) {
            const paciente = await PacienteCtr.findById(inscripcion.paciente.id);
            domicilio = paciente.direccion.find(dir => dir.ubicacion.provincia?.nombre && replaceChars(dir.ubicacion.provincia?.nombre as any).toLowerCase() === replaceChars(provincia));
        }
        if (!domicilio) {
            domicilio = inscripcion.direccion.find(dir => dir.ubicacion.provincia?.nombre && replaceChars(dir.ubicacion.provincia?.nombre as any).toLowerCase() === replaceChars(provincia));
        }
        return domicilio;
    } catch {
        return null;
    }
}

export async function verificarExistenciaCertificado(inscripcion) {
    try {
        // se verifica el domicilio del paciente asociado a la inscripción
        if (inscripcion.paciente && inscripcion.paciente.id) {
            let query = {
                'paciente.id': inscripcion.paciente.id,
                'estadoActual.tipo': 'validada',
                'ejecucion.registros.concepto.conceptId': '2171000246104'
            };
            let prestacion: any = await Prestacion.findOne(query);
            if (prestacion) {
                inscripcion.fechaCertificado = prestacion.ejecucion.fecha;
                inscripcion.idPrestacionCertificado = prestacion._id;
            }
        }
        return inscripcion;
    } catch {
        return null;
    }
}

export async function validarInscripcion(inscripcion, inscriptoValidado, req) {

    if (inscripcion.grupo && inscripcion.grupo.nombre === 'personal-salud' && !inscripcion.personal_salud) {
        if (inscripcion.estado === 'habilitado') {
            inscripcion.personal_salud = true;
        } else {
            const profesional = await Profesional.findOne({ documento: inscripcion.documento, sexo: inscripcion.sexo }, { nombre: true, apellido: true });
            if (!profesional) {
                // Busco si es personal de salud
                const personal = await PersonalSaludCtr.findOne({ documento: inscripcion.documento });
                if (personal) {
                    inscripcion.personal_salud = true;
                    inscripcion.estado = 'habilitado';
                }
            }
        }
    }
    // Verifica el domicilio del paciente
    if (!inscripcion.validaciones?.includes('domicilio')) {
        if (!inscriptoValidado) {
            inscriptoValidado = await validar(inscripcion.documento, inscripcion.sexo);
        }
        const domicilio = await validarDomicilio(inscriptoValidado);
        if (domicilio) {
            if (inscripcion.validaciones?.length) {
                inscripcion.validaciones.push('domicilio');
            } else {
                inscripcion.validaciones = ['domicilio'];
            }
        }
    }
    let paciente = null;
    if (!(inscripcion.paciente && inscripcion.paciente.id)) {
        // Realizar el matcheo y actualizar
        if (!inscriptoValidado) {
            inscriptoValidado = await validar(inscripcion.documento, inscripcion.sexo);
        }
        if (inscriptoValidado) {
            const value = await matching(inscriptoValidado, inscripcion);
            if (value < mpi.cotaMatchMax) {
                inscripcion.validado = false;
            } else {
                await extractFoto(inscriptoValidado, req);
                paciente = await findOrCreate(inscriptoValidado, req);
                if (paciente && paciente.id) {
                    inscripcion.paciente = {
                        id: paciente.id,
                        nombre: paciente.nombre,
                        apellido: paciente.apellido,
                        documento: paciente.documento,
                        telefono: paciente.telefono,
                        sexo: paciente.sexo,
                        fechaNacimiento: paciente.fechaNacimiento
                    };
                    inscripcion.validado = true;
                    inscripcion.fechaValidacion = new Date();
                }
            }
        }
    } else {
        paciente = await PacienteCtr.findById(inscripcion.paciente.id);
    }
    if (paciente) {
        const contactos = [{ tipo: 'celular', valor: inscripcion.telefono }, { tipo: 'email', valor: inscripcion.email }];
        await updateContacto(contactos, paciente, req);
    }
    await verificarExistenciaCertificado(inscripcion);
    return inscripcion;

}


export async function updateInsriptosFallecidos() {
    const req: any = userScheduler;
    try {
        const resultado = await services.get('xroad-fallecidos').exec({});
        if (resultado && resultado.resultado1) {
            const fallecidos = JSON.parse(resultado.resultado1);
            for (const fallecido of fallecidos) {
                const sexo = fallecido['Sexo'] === 'F' ? 'femenino' : 'masculino';
                const documento = fallecido['DNI'].toString();
                const inscriptos = await InscripcionVacunasCtr.search({ documento, sexo });
                for (const inscripto of inscriptos) {
                    await InscripcionVacunasCtr.update(
                        inscripto.id,
                        { estado: 'fallecido' },
                        req
                    );
                }
            }
        }
    } catch (err) {
    }
}
