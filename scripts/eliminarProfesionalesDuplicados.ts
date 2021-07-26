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
        }
    ];
};

const decoder = base64.decode();
const input = new stream.PassThrough();

/**
 *
 * @param idOld id del profesional a desasociar la firma
 * @param idNew id del profesional al que se asociara la firma
 */
async function asociarFirma(idOld: string, idNew: string) {
    const firma = makeFsFirma();
    const fileFirma = await firma.findOne({ 'metadata.idProfesional': idOld });
    if (fileFirma) {
        fileFirma['metadata.idProfesional'] = idNew;
        await firma.unlink(fileFirma._id, (error) => { });
        return new Promise((resolve, reject) => {
            firma.writeFile(fileFirma, input.pipe(decoder),
                (error, createdFile) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(createdFile);
                });
            input.end();
        });
    }
}

/**
 *
 * @param idOld id del profesional a desasociar la foto
 * @param idNew id del profesional al que se asociara la foto
 */
async function asociarFoto(idOld: string, idNew: string) {
    const foto = makeFs();
    const fileFoto = await foto.findOne({ 'metadata.idProfesional': idOld });
    if (fileFoto) {
        fileFoto['metadata.idProfesional'] = idNew;
        await foto.unlink(fileFoto._id, (error) => { });
        return new Promise((resolve, reject) => {
            foto.writeFile(fileFoto, input.pipe(decoder),
                (error, createdFile) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(createdFile);
                });
            input.end();
        });
    }
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
                        updatedAt: '$updatedAt'
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
        // Se ordenan duplicados por fecha de creación. El primer registro creado será el profesional activo
        const dupsSorted = data.dups.sort((a, b) => {
            const f1 = a.createdAt || a.updatedAt;
            const f2 = b.createdAt || b.updatedAt;
            if (f1) {
                if (f2) {
                    return moment(f1).diff(moment(f2));
                } else { return 1; }
            } else { return -1; }
        });

        try {
            let profesionalActivo = await Profesional.findById(dupsSorted.shift().id);
            let profesionalDuplicado: any = dupsSorted[0];
            profesionalDuplicado = await Profesional.findById(dupsSorted[0].id);

            // Si el duplicado posee firma, se le asocia al profesional activo. Lo mismo con la foto.
            await asociarFirma(profesionalDuplicado.id.toString(), profesionalActivo.id.toString());
            await asociarFoto(profesionalDuplicado.id.toString(), profesionalActivo.id.toString());

            // Se asocian turnos y prestaciones del profesional duplicado al activo.
            await Agenda.updateMany(
                { 'profesionales._id': profesionalDuplicado.id },
                { $set: { 'profesionales.$[elemento]._id': profesionalActivo.id } },
                { arrayFilters: [{ 'elemento._id': profesionalDuplicado.id }] }
            );
            await Prestacion.updateMany(
                { 'solicitud.profesional.id': profesionalDuplicado.id },
                { $set: { 'solicitud.profesional.id': profesionalActivo.id } }
            );

            const idProfesional = profesionalDuplicado.id;
            if (profesionalDuplicado.profesionalMatriculado) {
                delete profesionalDuplicado.id;
                delete profesionalDuplicado._id;
                profesionalActivo = profesionalDuplicado;
                await Profesional.update(
                    { _id: profesionalActivo },
                    { $set: { activo: false } }
                );
            }
            // Se inactivan los duplicados
            await Profesional.update(
                { _id: idProfesional },
                { $set: { activo: false } }
            );


        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DNI: ', data._id.documento, '\n', err.message);
        }
    }

    done();
}

export = run;

