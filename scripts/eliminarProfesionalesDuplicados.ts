import { Profesional } from '../core/tm/schemas/profesional';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { ObjectID } from 'bson';
import { makeFsFirma } from '../core/tm/schemas/firmaProf';
import { makeFs } from '../core/tm/schemas/imagenes';
import * as base64 from 'base64-stream';
import * as stream from 'stream';
import moment = require('moment');
interface IDuplicado {
    _id: {
        documento: string;
    };
    count: number;
    dups: [
        {
            id: ObjectID;
            apellido: string;
            documento: string;
            nombre: string;
            createdAt?: Date;
            updatedAt?: Date;
            profesionalMatriculado?: boolean;
            formacionGrado?: any[];
        }
    ];
};

/**
 *
 * @param idOld id del profesional a desasociar la firma
 * @param idNew id del profesional al que se asociara la firma
 */
async function asociarFirma(idNew: string, idOld: string) {
    const firma = makeFsFirma();
    const fileFirmaNuevo = await firma.findOne({ 'metadata.idProfesional': idNew });
    if (!fileFirmaNuevo) {
        const fileFirmaViejo = await firma.findOne({ 'metadata.idProfesional': idOld });
        if (fileFirmaViejo) {
            const decoder1 = base64.decode();
            const input1 = new stream.PassThrough();
            const readStream = await firma.readFile({ _id: fileFirmaViejo._id });
            const firmaProfesional = await streamToBase64(readStream);
            if (firmaProfesional) {
                await firma.unlink(fileFirmaViejo._id, (error) => { });
                await new Promise((resolve, reject) => {
                    firma.writeFile(
                        {
                            filename: 'foto.png',
                            contentType: 'image/png',
                            metadata: {
                                idProfesional: idNew,
                            }
                        }, input1.pipe(decoder1),
                        (error, createdFile) => {
                            if (error) {
                                reject(error);
                            }
                            resolve(createdFile);
                        });
                    input1.end(firmaProfesional);
                });
            }
        }
    }
}

/**
 *
 * @param idOld id del profesional a desasociar la foto
 * @param idNew id del profesional al que se asociara la foto
 */
async function asociarFoto(idNew: string, idOld: string) {
    const foto = makeFs();
    const fileFotoNuevo = await foto.findOne({ 'metadata.idProfesional': idNew });
    if (!fileFotoNuevo) {
        const fileFotoViejo = await foto.findOne({ 'metadata.idProfesional': idOld });
        if (fileFotoViejo) {
            const input2 = new stream.PassThrough();
            const decoder2 = base64.decode();
            const readStream = await foto.readFile({ _id: fileFotoViejo._id });
            const fotoProfesional = await streamToBase64(readStream);
            if (fotoProfesional) {
                await foto.unlink(fileFotoViejo._id, (error) => { });
                await new Promise((resolve, reject) => {
                    foto.writeFile(
                        {
                            filename: 'foto.png',
                            contentType: 'image/png',
                            metadata: {
                                idProfesional: idNew,
                            }
                        }, input2.pipe(decoder2),
                        (error, createdFile) => {
                            if (error) {
                                reject(error);
                            }
                            resolve(createdFile);
                        });
                    input2.end(fotoProfesional);
                });
            }
        }
    }
}

// Función para obtener las imagenes de fotos y firmas del profesional.
function streamToBase64(streamData) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        streamData.on('data', (chunk) => {
            chunks.push(chunk);
        });
        streamData.on('end', () => {
            const result = Buffer.concat(chunks);
            return resolve(result.toString('base64'));
        });
        streamData.on('error', (err) => {
            return reject(err);
        });
    });
}

// Función para unificar los arrays de formacionGrado sin profesiones repetidas
function unificarFormacionGrado(fgViejo, fgNuevo) {
    const formUnica = !fgNuevo ? [] : fgNuevo.map((unaFG) => unaFG);
    if (fgViejo) {
        fgViejo.forEach(unaFG => {
            const index = formUnica.findIndex((elem) => elem.profesion.codigo === unaFG.profesion.codigo);
            if (index === -1) {
                formUnica.push(unaFG);
            } else {
                // si coincide profesión en ambos profesionales
                // entonces verifica matricula
                const noExisteMat = !formUnica[index].matriculado && unaFG.matriculado;
                // si ambos tienen y es el mismo numero => nos quedamos con la que vence más tarde
                const matUnif = formUnica[index].matriculacion;
                const matFG = unaFG.matriculacion;
                const coincideNum = (matUnif?.length && matFG?.length) && (matUnif[0]?.matriculaNumero === matFG[0]?.matriculaNumero);
                const faltaMasVencer = coincideNum ? matUnif[matUnif.length - 1]?.fin < matFG[matFG.length - 1]?.fin : null;
                if (noExisteMat || faltaMasVencer) {
                    formUnica.splice(index, 1, unaFG);
                }
            }
        });
    }
    return formUnica;
}

async function run(done) {
    const duplicados: IDuplicado[] = await Profesional.aggregate([
        {

            $group: {
                _id: {
                    documento: '$documento'
                },
                dups: {
                    $push: {
                        id: '$_id',
                        nombre: '$nombre',
                        apellido: '$apellido',
                        documento: '$documento',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt',
                        formacionGrado: '$formacionGrado',
                        profesionalMatriculado: '$profesionalMatriculado'
                    }
                },
                count: {
                    $sum: 1
                }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]);

    const fechaDesde = moment().startOf('year').toDate();
    for (const data of duplicados) {
        // Se crea un nuevo array con los profesionales duplicados ordenados por fecha de creción o de actualización.
        const dupsSorted: any[] = data.dups.sort((a, b) => {
            // ver de agregar control por daltos de matricula, si tiene los datos de matriculacion
            const f1 = a.updatedAt || a.createdAt;
            const f2 = b.updatedAt || b.createdAt;
            const sort = (f1 && f2) ? moment(f1).diff(moment(f2)) :
                f1 ? 1 : -1;
            return sort;
        });
        // Verificamos si existe un profesionalMatriculado en false.
        const indexNoMat = dupsSorted.findIndex(d => !d.profesionalMatriculado);
        const indexMat = dupsSorted.findIndex(d => d.profesionalMatriculado);
        let profesionalNuevo, profesionalViejo;
        if (indexNoMat !== -1 && indexMat !== -1) {
            profesionalViejo = dupsSorted[indexNoMat];
            profesionalNuevo = dupsSorted[indexMat];
        } else {
            profesionalViejo = dupsSorted.shift();
            profesionalNuevo = dupsSorted[0];
        }
        try {
            // Profesional duplicado con 2 matriculas distintas en una misma profesión
            let dobleMat = null;
            if (profesionalNuevo.formacionGrado) {
                for (const unaFG of profesionalNuevo.formacionGrado) {
                    const mat1 = unaFG.matriculacion;
                    dobleMat = profesionalViejo.formacionGrado?.find((elem) => {
                        const igualProf = elem.profesion?.codigo === unaFG.profesion?.codigo;
                        const existeMat = igualProf && elem.matriculacion?.length && mat1?.length;
                        return existeMat ? elem.matriculacion[0].matriculaNumero !== mat1[0].matriculaNumero : false;
                    });
                }
            }
            if (!dobleMat) {
                // coincide profesión, entonces verifica matricula:
                // (no llegaría con dos profesionales con distinta matricula, para igual profesión)
                const formacionUnificada = unificarFormacionGrado(profesionalViejo.formacionGrado, profesionalNuevo.formacionGrado);
                profesionalNuevo.formacionGrado = formacionUnificada;

                // Si el duplicado posee firma, se le asocia al profesional activo. Lo mismo con la foto.
                const firmaPromise = await asociarFirma(profesionalNuevo.id.toString(), profesionalViejo.id.toString());
                const fotoPromise = await asociarFoto(profesionalNuevo.id.toString(), profesionalViejo.id.toString());

                // Se asocian turnos y prestaciones del profesional duplicado al activo
                // registrados en el último año
                const agendaPromise = Agenda.updateMany(
                    {
                        'profesionales._id': profesionalViejo.id,
                        horaInicio: { $gte: fechaDesde }
                    },
                    { $set: { 'profesionales.$[elemento]._id': profesionalNuevo.id } },
                    { arrayFilters: [{ 'elemento._id': profesionalViejo.id }] }
                );

                const prestacionPromise = Prestacion.updateMany(
                    {
                        'solicitud.profesional.id': profesionalViejo.id,
                        'solicitud.fecha': { $gte: fechaDesde }
                    },
                    { $set: { 'solicitud.profesional.id': profesionalNuevo.id } }
                );

                // Se inactiva el profesional duplicado
                const profesionalViejoPromise = Profesional.update(
                    { _id: profesionalViejo.id },
                    { $set: { activo: false } }
                );

                const profesionalNuevoPromise = Profesional.update(
                    { _id: profesionalNuevo.id },
                    { $set: { formacionGrado: profesionalNuevo.formacionGrado } }
                );

                await Promise.all([firmaPromise, agendaPromise, prestacionPromise, profesionalNuevoPromise, profesionalViejoPromise, fotoPromise]);
            } else {
                // eslint-disable-next-line no-console
                console.error('Matricula duplicada DNI: ', data._id.documento);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DNI: ', data._id.documento, '\n', err.message);
        }
    }
    done();
}

export = run;

