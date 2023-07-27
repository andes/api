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
                return new Promise((resolve, reject) => {
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
                return new Promise((resolve, reject) => {
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
    const formacionUnificada = [];

    fgViejo.forEach((elemento) => {
        if (!formacionUnificada.some((elem) => elem.profesion.codigo === elemento.profesion.codigo)) {
            formacionUnificada.push(elemento);
        }
    });

    fgNuevo.forEach(elemento => {
        const index = formacionUnificada.findIndex((elem) => elem.profesion.codigo === elemento.profesion.codigo);
        if (index === -1) {
            formacionUnificada.push(elemento);
        } else {
            if (elemento.matriculado && !formacionUnificada[index].matriculado) {
                formacionUnificada.splice(index, 1, elemento);
            }
        }
    });
    return formacionUnificada;
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

    for (const data of duplicados) {
        // Se crea un nuevo array con los profesionales duplicados ordenados por fecha de creción o de actualización.
        const dupsSorted = data.dups.sort((a, b) => {
            const f1 = a.createdAt || a.updatedAt;
            const f2 = b.createdAt || b.updatedAt;
            if (f1) {
                if (f2) {
                    return moment(f1).diff(moment(f2));
                } else { return 1; }
            } else { return -1; }
        });

        let profesionalViejo = dupsSorted.shift();
        let profesionalNuevo = dupsSorted[0];
        // Verificamos si existe un profesionalMatriculado en false.
        const index = dupsSorted.findIndex(d => !d.profesionalMatriculado);
        if (index === 0) {
            profesionalNuevo = dupsSorted.shift();
            profesionalViejo = dupsSorted[0];
        }
        try {

            // Unificamos los arrays de formacionGrado sin repetir la profesiónes que tengan matriculas
            const formacionUnificada = unificarFormacionGrado(profesionalViejo.formacionGrado, profesionalNuevo.formacionGrado);
            profesionalNuevo.formacionGrado = formacionUnificada;

            // Si el duplicado posee firma, se le asocia al profesional activo. Lo mismo con la foto.
            const firmaPromise = asociarFirma(profesionalNuevo.id.toString(), profesionalViejo.id.toString());
            const fotoPromise = asociarFoto(profesionalNuevo.id.toString(), profesionalViejo.id.toString());

            // Se asocian turnos y prestaciones del profesional duplicado al activo.
            const agendaPromise = Agenda.updateMany(
                { 'profesionales._id': profesionalViejo.id },
                { $set: { 'profesionales.$[elemento]._id': profesionalNuevo.id } },
                { arrayFilters: [{ 'elemento._id': profesionalViejo.id }] }
            );

            const prestacionPromise = Prestacion.updateMany(
                { 'solicitud.profesional.id': profesionalViejo.id },
                { $set: { 'solicitud.profesional.id': profesionalNuevo.id } }
            );

            // Se inactivan los duplicados
            const profesionalNuevoPromise = Profesional.update(
                { _id: profesionalViejo.id },
                { $set: { activo: false } }
            );

            const profesionalViejoPromise = Profesional.update(
                { _id: profesionalNuevo.id },
                { $set: { formacionGrado: profesionalNuevo.formacionGrado } }
            );

            await Promise.all([firmaPromise, agendaPromise, prestacionPromise, profesionalNuevoPromise, profesionalViejoPromise, fotoPromise]);

        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DNI: ', data._id.documento, '\n', err.message);
        }
    }
    done();
}

export = run;

