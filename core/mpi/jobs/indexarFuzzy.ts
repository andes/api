import { paciente } from '../../mpi/schemas/paciente';
const { each, queue } = require('async');


export const updateFuzzy = async (done, attrs) => {

    let cursor = await paciente.find({}).cursor();

    const updateToDatabase = async (data, callback) => {
        try {
            if (attrs && attrs.length) {
                const obj = attrs.reduce((acc, attr) => ({ ...acc, [attr]: data[attr] }), {});
                return paciente.findByIdAndUpdate(data._id, obj).exec();
            }

            return paciente.findByIdAndUpdate(data._id, data).exec();
        } catch (e) {
            console.log(e);
            return (e);
        } finally {
            callback();
        }
    };

    const myQueue = queue(updateToDatabase, 10);
    await cursor.eachAsync(async (data: any) => myQueue.push(data.toObject()));

    myQueue.empty = function () { };
    myQueue.drain = function () { };
    done();
}


