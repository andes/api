import { paciente } from '../../mpi/schemas/paciente';

export const updateFuzzy = async (done, attrs) => {
    const cursor = paciente.find({}).cursor({ batchSize: 100 });
    const updateToDatabase = async (data) => {
        try {
            if (attrs && attrs.length) {
                const obj = attrs.reduce((acc, attr) => ({ ...acc, [attr]: data[attr] }), {});
                return await paciente.findByIdAndUpdate(data._id, obj);
            }
            return await paciente.findByIdAndUpdate(data._id, data).exec();
        } catch (err) {
            return (err);
        }
    };
    await cursor.eachAsync(async (pac: any) => {
        await updateToDatabase(pac);
    });

    done();
};
