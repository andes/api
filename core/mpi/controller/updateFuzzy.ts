import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { userScheduler } from '../../../config.private';

export const updateFuzzy = async (done, attrs) => {
    const cursor = Paciente.find({}).cursor({ batchSize: 100 });
    const updateToDatabase = async (data) => {
        try {
            if (attrs && attrs.length) {
                const obj = attrs.reduce((acc, attr) => ({ ...acc, [attr]: data[attr] }), {});
                return await PacienteCtr.update(data._id, obj, userScheduler as any);
            }
            return await PacienteCtr.update(data._id, data, userScheduler as any);
        } catch (err) {
            return (err);
        }
    };
    await cursor.eachAsync(async (pac: any) => {
        await updateToDatabase(pac);
    });

    done();
};


export const generateTokensPatient = async (done) => {
    const cursor = Paciente.find({ tokens: { $exists: false } }).cursor({ batchSize: 100 });
    const updatePatient = async (data) => {
        try {
            let words = [];
            if (data.documento) {
                words.push(data.documento.toLowerCase());
            }
            if (data.nombre) {
                data.nombre.trim().toLowerCase().split(' ').forEach(doc => {
                    words.push(doc.trim().toLowerCase());
                });
            }
            if (data.apellido) {
                data.apellido.trim().toLowerCase().split(' ').forEach(doc => {
                    words.push(doc.trim().toLowerCase());
                });
            }
            if (data.alias) {
                data.alias.trim().toLowerCase().split(' ').forEach(doc => {
                    words.push(doc.trim().toLowerCase());
                });
            }
            if (data.numeroIdentificacion) {
                words.push(data.numeroIdentificacion.toLowerCase());
            }
            data.tokens = words;

            await PacienteCtr.update(data._id, data, userScheduler as any);
        } catch (err) {
            return (err);
        }
    };

    await cursor.eachAsync(async (pac: any) => {
        await updatePatient(pac);
    });

    done();
};
