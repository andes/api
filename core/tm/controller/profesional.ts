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
import { Auth } from './../../../auth/auth.class';

/**
 * funcion que controla los vencimientos de la matriculas y de ser necesario envia sms y email avisando al profesional.
 */
export async function vencimientoMatriculaGrado(done) {
    // let profesionales: any = await profesional.find({ 'formacionGrado.matriculado': true, profesionalMatriculado: true }, (data: any) => { return data; });
    const profesionales: any = await Profesional.find({ 'formacionGrado.matriculacion.fin': { $lte: new Date() }, 'formacionGrado.matriculado': true, profesionalMatriculado: true });

    for (let _n = 0; _n < profesionales.length; _n++) {
        if (profesionales[_n].habilitado === true) {
            for (let _i = 0; _i < profesionales[_n].formacionGrado.length; _i++) {
                if (profesionales[_n].formacionGrado[_i].matriculacion) {
                    if (profesionales[_n].formacionGrado[_i].matriculado === true && profesionales[_n].formacionGrado[_i].matriculacion[profesionales[_n].formacionGrado[_i].matriculacion.length - 1].fin <= new Date()) {
                        profesionales[_n].formacionGrado[_i].matriculado = false;
                        profesionales[_n].formacionGrado[_i].papelesVerificados = false;
                        await actualizar(profesionales[_n]);
                    }
                }
            }
        }
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
            _profesional.formacionGrado.filter(filterFormaciones).map(e => ({ nombre: e.titulo, numero: e.matriculacion[e.matriculacion.length - 1].matriculaNumero })) : [];
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
    if (fileFirma && fileFirma._id) {
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

