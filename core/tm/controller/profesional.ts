import * as base64 from 'base64-stream';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as stream from 'stream';
import { userScheduler } from '../../../config.private';
import * as turno from '../../../modules/matriculaciones/schemas/turno';
import { turnoSolicitado } from '../../../modules/matriculaciones/schemas/turnoSolicitado';
import { makeFsFirmaAdmin } from '../schemas/firmaAdmin';
import { makeFsFirma } from '../schemas/firmaProf';
import { Profesional } from '../schemas/profesional';
import { profesion } from '../schemas/profesion_model';
import { EntidadFormadora } from '../schemas/siisa';
import { Auth } from './../../../auth/auth.class';
import { findUsersByUsername } from './../../../auth/auth.controller';
import { services } from '../../../services';
import { sisaProfesionalLog } from '../../../modules/sisa/logger/sisaLog';


/**
 * funcion que controla los vencimientos de la matriculas y de ser necesario envia sms y email avisando al profesional.
 */
export async function vencimientoMatriculaGrado(done) {
    const profesionales: any = Profesional.aggregate([
        { $match: { 'formacionGrado.matriculado': true, profesionalMatriculado: true, habilitado: true } },
        { $unwind: '$formacionGrado' },
        { $addFields: { lastMatriculacion: { $arrayElemAt: ['$formacionGrado.matriculacion', -1] } } },
        { $match: { 'lastMatriculacion.fin': { $lte: new Date() } } }
    ]).cursor({ batchSize: 100 });
    for await (const profesional of profesionales) {
        profesional.formacionGrado.matriculado = false;
        profesional.formacionGrado.papelesVerificados = false;
        await Profesional.update(
            {
                _id: profesional._id
            },

            { $set: { 'formacionGrado.$[elemento]': profesional.formacionGrado } },

            {
                arrayFilters: [{ 'elemento._id': profesional.formacionGrado._id }]
            }
        );
    }
    done();
}

export async function vencimientoMatriculaPosgrado(done) {
    const profesionales: any = await Profesional.find({ 'formacionPosgrado.matriculado': true, profesionalMatriculado: true, 'formacionPosgrado.tieneVencimiento': true }, (data: any) => { return data; });
    for (let _n = 0; _n < profesionales.length; _n++) {
        if (profesionales[_n].habilitado === true) {
            if (profesionales[_n].formacionPosgrado) {
                for (let _i = 0; _i < profesionales[_n].formacionPosgrado.length; _i++) {
                    if (profesionales[_n].formacionPosgrado[_i].matriculacion.length > 0) {
                        if (profesionales[_n].formacionPosgrado[_i].matriculado === true && profesionales[_n].formacionPosgrado[_i].tieneVencimiento === true && profesionales[_n].formacionPosgrado[_i].matriculacion[profesionales[_n].formacionPosgrado[_i].matriculacion.length - 1].fin.getFullYear() < new Date().getFullYear()) {
                            profesionales[_n].formacionPosgrado[_i].matriculado = false;
                            profesionales[_n].formacionPosgrado[_i].papelesVerificados = false;
                            await actualizar(profesionales[_n]);

                        }
                    }
                }
            }
        }

    }
    done();
}

/**
 * funcion que actualiza la formacion grado, formacion posgrado y estados de vencimientos;
 * @param profesional  profesional a modificar
 */
async function actualizar(unProfesional) {
    Auth.audit(unProfesional, (userScheduler as any));
    await unProfesional.save();
}

export async function migrarTurnos() {
    const profesionales: any = await Profesional.find({ turno: { $gte: new Date() } }, (data: any) => { return data; });
    profesionales.forEach(unProfesional => {
        let tipoDeTurno;
        const turnoSolicitud = {
            nombre: unProfesional.nombre,
            apellido: unProfesional.apellido,
            documento: unProfesional.documento,
            fecha: unProfesional.turno,
            idRenovacion: unProfesional._id
        };


        const formacionGrado = unProfesional.formacionGrado;
        if (formacionGrado.length === 1 && formacionGrado[formacionGrado.length - 1].matriculacion === null) {
            tipoDeTurno = 'matriculacion';
        } else {
            tipoDeTurno = 'renovacion';
        }

        const newTurnoSolicitado = new turnoSolicitado(turnoSolicitud);
        const unTurno: any = newTurnoSolicitado.save((err2) => {

            const nTurno = new turno({
                notificado: false,
                sePresento: false,
                fecha: unProfesional.turno,
                tipo: tipoDeTurno,
                profesional: newTurnoSolicitado._id
            });

            nTurno.save((err) => {
            });

        });


    });
}

export async function matriculaCero() {
    const profesionales: any = await Profesional.find({ 'formacionGrado.matriculacion.matriculaNumero': 0 }, (data: any) => { return data; });
    profesionales.forEach((unProfesional, i) => {
        const formacionGrado = unProfesional.formacionGrado;
        formacionGrado.forEach((element, n) => {
            if (element.matriculacion[element.matriculacion.length - 1].matriculaNumero === 0) {
                unProfesional.formacionGrado[n].matriculacion = null;
            }
        });
        Profesional.findByIdAndUpdate(unProfesional.id, unProfesional, (err, resultado: any) => { });
    });
}


export async function formacionCero() {
    const profesionales: any = await Profesional.find({ $where: 'this.formacionGrado.length > 1 && this.formacionGrado[0].matriculacion == null' }, (data: any) => { return data; });
    return profesionales;
}

export async function search(filter, fields) {
    const match = {};
    const project = { documento: -1, apellido: -1, nombre: -1 };
    if (filter.id) {
        match['_id'] = mongoose.Types.ObjectId(filter.id);
    }
    if (fields.matricula) {
        project['matricula'] = { $arrayElemAt: ['$formacionGrado.matriculacion.matriculaNumero', -1] };
    }

    const aggregate = [
        {
            $match: match
        },
        {
            $project: project
        },

    ];

    return await Profesional.aggregate(aggregate);
}

export async function searchMatriculas(profesionalId) {
    const _profesional: any = await Profesional.findById(profesionalId);
    const filterFormaciones = (e) => {
        return e.matriculacion && e.matriculacion.length && !e.matriculacion[e.matriculacion.length - 1].baja.fecha && moment(e.matriculacion[e.matriculacion.length - 1].fin).isAfter(new Date());
    };

    let formacionGrado;
    let formacionPosgrado;
    if (_profesional.profesionalMatriculado) {
        formacionGrado = _profesional.formacionGrado ?
            _profesional.formacionGrado.filter(filterFormaciones).map(e => ({ nombre: e.titulo, profesion: e.profesion.codigo, numero: e.matriculacion[e.matriculacion.length - 1].matriculaNumero })) : [];
        formacionPosgrado = _profesional.formacionPosgrado ?
            _profesional.formacionPosgrado.filter(filterFormaciones).map(e => ({ nombre: e.especialidad.nombre, numero: e.matriculacion[e.matriculacion.length - 1].matriculaNumero })) : [];
    } else {
        if (_profesional.matriculaExterna && _profesional.profesionExterna) {
            formacionGrado = [{
                nombre: _profesional.profesionExterna.nombre,
                numero: _profesional.matriculaExterna
            }];
        } else {
            formacionGrado = [];
        }
        formacionPosgrado = [];
    }

    return {
        nombre: _profesional.nombre,
        apellido: _profesional.apellido,
        formacionGrado,
        formacionPosgrado
    };
}

export async function saveFirma(data, admin = false) {
    const _base64 = data.firmaP || data.firma;
    const decoder = base64.decode();
    const input = new stream.PassThrough();
    let firma;
    let metadataFind;
    let metadataWrite;

    if (admin) {
        firma = makeFsFirmaAdmin();
        metadataFind = { 'metadata.idSupervisor': data.idSupervisor };
        metadataWrite = {
            idSupervisor: data.idSupervisor,
            administracion: data.nombreCompleto
        };
    } else {
        firma = makeFsFirma();
        metadataFind = { 'metadata.idProfesional': data.idProfesional };
        metadataWrite = { idProfesional: data.idProfesional };
    }

    // Remueve la firma anterior antes de insertar la nueva
    const fileFirma = await firma.findOne(metadataFind);
    if (fileFirma?._id) {
        await firma.unlink(fileFirma._id, (error) => { });
    }
    // Inserta en la bd en files y chunks
    return new Promise((resolve, reject) => {
        firma.writeFile(
            {
                filename: admin ? 'firmaAdmin.png' : 'firma.png',
                contentType: 'image/jpeg',
                metadata: metadataWrite
            }, input.pipe(decoder),
            (error, createdFile) => {
                if (error) {
                    reject(error);
                }
                resolve(createdFile);
            }
        );
        input.end(_base64);
    });
}

export async function filtrarProfesionalesPorPrestacion(profesionales, prestaciones, organizacionId) {
    const usuarios = await findUsersByUsername(profesionales.map(p => p.documento));

    profesionales = profesionales.filter(p => {
        const usuario = usuarios.find(u => String(u.usuario) === p.documento);
        if (!usuario) {
            return false;
        }
        const orgPermisos = usuario.organizaciones.find(o => o._id.toString() === organizacionId);
        if (!orgPermisos) {
            return false;
        }
        return prestaciones.some(s => orgPermisos.permisos.includes(`rup:tipoPrestacion:${s}`));
    });

    return profesionales;
}

export async function validarProfesionalPrestaciones(profesionales, tipoPrestaciones, organizacionId) {
    // es posible que el profesional venga en su versión reducida (sin documento, solo nombre completo e _id). En ese caso recuperamos el prof completo
    profesionales = profesionales || [];
    profesionales = await Promise.all(profesionales.map(prof => prof.documento ? prof : Profesional.findById(prof.id)));

    const profesionalesFiltrados = await filtrarProfesionalesPorPrestacion(profesionales, tipoPrestaciones, organizacionId);
    if (profesionales.length > profesionalesFiltrados.length) {
        const results = profesionales.filter(({ _id: id1 }) => !profesionalesFiltrados.some(({ _id: id2 }) => id2 === id1));
        const rechazados = results.reduce((p, c, i) => `${p}${i > 0 ? i < results.length - 1 ? ', ' : ' y ' : ''}${c.nombre} ${c.apellido}`, '');
        const msgError = `${results.length > 1 ? 'Los profesionales' : 'El profesional'}
            ${rechazados} no ${results.length > 1 ? ' poseen' : 'posee'} permisos para las prestaciones seleccionadas`;
        return msgError;
    }

    return null;
}

export async function exportarMatriculasGado(done) {

    const start = (moment(new Date()).startOf('day').subtract(2, 'days').toDate() as any);
    const end = (moment(new Date()).startOf('day').toDate() as any);

    const pipelineProfesionales = [
        {
            $match: {
                profesionalMatriculado: true,
                habilitado: true,
                $or: [
                    {
                        updatedAt: {
                            $gte: new Date(start), $lte: new Date(end)
                        }
                    },
                    {
                        createdAt: {
                            $gte: new Date(start), $lte: new Date(end)
                        }
                    },
                ]
            }
        },
    ];

    const profesionales: any = await Profesional.aggregate(pipelineProfesionales);

    for await (const profesional of profesionales) {
        let configuracionSisa = null;
        const formacionesGrado = profesional.formacionGrado.filter(async e => e.matriculado);
        for (const formacionGrado of formacionesGrado) {
            const profesionalSisa = await crearProfesionalSISA(profesional, formacionGrado);
            const response = await cargaMatriculaSisa(profesionalSisa);
            if (response) {
                configuracionSisa = {
                    idSisa: response.idProfesional,
                    codigoSisa: response.codigoProfesional
                };
                const configuracionSisaMat = {
                    idProfesionSisa: response.idProfesion,
                    idMatriculaSisa: response.idMatricula
                };
                formacionGrado['configuracionSisa'] = configuracionSisaMat;
            }

        }
        await Profesional.update({ _id: profesional._id },
            { $set: { configuracionSisa, formacionGrado: formacionesGrado } });

    }
    done();

}

export async function cargaMatriculaSisa(profesionalSisa) {
    let response1 = null;
    try {
        response1 = await services.get('SISA-WS24-v2').exec(profesionalSisa);
        if (response1.resultado !== 'OK') {
            await sisaProfesionalLog.info('sisa:export:SNVS:evento', { profesionalSisa, error: response1 }, userScheduler);
            return null;
        }
        return response1;
    } catch (e) {
        await sisaProfesionalLog.error('sisa:export:SNVS:evento', { profesionalSisa }, e.message, userScheduler);
        return null;
    }
}

async function crearProfesionalSISA(profesional, formacionGrado) {
    // Datos del profesional
    const profesionalSisa = {
        profesional: {},
        profesion: {},
        matricula: {
            emisor: {
                domicilio: {}
            }
        }

    };
    profesionalSisa['profesional']['apellido'] = profesional.apellido;
    profesionalSisa['profesional']['nombre'] = profesional.nombre;
    profesionalSisa['profesional']['tipoDocumento'] = 1;
    profesionalSisa['profesional']['numeroDocumento'] = parseInt(profesional.documento, 10);
    profesionalSisa['profesional']['sexo'] = (profesional.sexo === 'femenino' || profesional.sexo === 'Femenino') ? 'F' : (profesional.sexo === 'masculino' || profesional.sexo === 'Masculino') ? 'M' : 'X';
    profesionalSisa['profesional']['fechaNacimiento'] = moment(profesional.fechaNacimiento).format('DD-MM-YYYY');
    const email = profesional.contactos.find(x => x.tipo === 'email' && x.valor);
    profesionalSisa['profesional']['email'] = email ? email.valor : '';
    profesionalSisa['profesional']['idPaisNacimiento'] = 200;
    profesionalSisa['profesional']['idPais'] = 200;
    profesionalSisa['profesional']['habilitado'] = 'SI';
    profesionalSisa['profesion']['titulo'] = formacionGrado ? formacionGrado.titulo : '';

    profesionalSisa['profesion']['fechaTitulo'] = moment(formacionGrado.fechaEgreso).format('DD-MM-YYYY');

    const profesionDeReferencia: any = await profesion.findOne({ codigo: formacionGrado.profesion.codigo });
    if (profesionDeReferencia) {
        profesionalSisa['profesion']['idProfesionReferencia'] = profesionDeReferencia.profesionCodigoRef ? profesionDeReferencia.profesionCodigoRef : '';
    }

    if (formacionGrado.entidadFormadora.codigo) {
        profesionalSisa['profesion']['idInstitucionFormadora'] = parseInt(formacionGrado.entidadFormadora.codigo, 10);
    } else {
        const entidadFormadora: any = await EntidadFormadora.findById(formacionGrado.entidadFormadora._id);
        if (entidadFormadora && entidadFormadora.length) {
            profesionalSisa['profesion']['idInstitucionFormadora'] = parseInt(entidadFormadora[0].codigo, 10);
        }
    }
    profesionalSisa['profesion']['revalida'] = 'NO';

    // Datos de la matrícula
    const matriculaciones = formacionGrado.matriculacion && formacionGrado.matriculacion.sort((a, b) => (a.inicio - b.inicio));
    profesionalSisa['matricula']['fecha'] = moment(formacionGrado.fechaDeInscripcion).format('DD-MM-YYYY');
    if (formacionGrado?.matriculacion?.length && matriculaciones[matriculaciones.length - 1]?.matriculaNumero) {
        const matricula = matriculaciones[matriculaciones.length - 1];
        profesionalSisa['matricula']['fechaFin'] = moment(matricula.fin).format('DD-MM-YYYY');
        profesionalSisa['matricula']['codigo'] = parseInt(matricula.matriculaNumero, 10);
    }
    profesionalSisa['matricula']['rematriculacion'] = 'NO';
    profesionalSisa['matricula']['idProvincia'] = 15;
    if (formacionGrado?.profesion?.codigo) {
        profesionalSisa['matricula']['idProfesion'] = parseInt(formacionGrado.profesion.codigo, 10);
    }
    const domicilio = profesional.domicilios.find(x => x.tipo === 'real');
    profesionalSisa['matricula']['emisor']['domicilio']['calle'] = domicilio ? domicilio.valor : '';
    profesionalSisa['matricula']['emisor']['domicilio']['idProvincia'] = 15;
    profesionalSisa['matricula']['emisor']['domicilio']['idPais'] = 200;
    const tel_celular = profesional.contactos.find(x => x.tipo === 'celular' && x.valor);
    const tel_fijo = profesional.contactos.find(x => x.tipo === 'fijo' && x.valor);
    profesionalSisa['matricula']['emisor']['tieneTelefono'] = (tel_celular || tel_fijo) ? 'SI' : 'NO';
    let j = 1;
    profesional.contactos.forEach((cp, i) => {
        if ((cp.tipo === 'celular' || cp.tipo === 'fijo') && (cp.valor.trim() !== '')) {
            const idTel = 'idTipoTelefono' + j;
            const tel = 'telefono' + j;
            j++;
            profesionalSisa['matricula']['emisor'][idTel] = cp.tipo === 'fijo' ? 1 : 2;
            profesionalSisa['matricula']['emisor'][tel] = cp.valor.trim();
        }
    });
    return profesionalSisa;
}
