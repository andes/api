import * as mongoose from 'mongoose';

async function run(done) {
    const registerIds = [
        '6042720768796d29fc6ea674', // Pacientes inscriptos a vacunacion en el grupo de 18 a 59 con discapacidad
        '604ca7e1b18dad57d8d3b2a7', // Pacientes inscriptos a vacunacion en el grupo de fuerzas de seguridad
        '604fb6a0b18dad57d8f7c239', // Pacientes inscriptos a vacunacion en el grupo de personas entre 18 y 59 con factores de riesgo
        '60521cdab18dad57d80cc417', // Personal de salud inscriptos a vacunacion
        '6054d384b18dad57d8302ee0', // Adultos mayores de 60 años inscriptos a vacunacion
        '6078f5e35c197b3e76387b2f', // Inscripciones vacunacion
        '60b7e7b970569dd3adec3137', // Listado pacientes inscriptos no vacunados
        '615b8ec41506238a454ff1dc' // Inscriptos pendientes de vacunación en el grupo de personas entre 3 y 11 años
    ];
    const query = {
        '_id': { $in: registerIds }
    };
    const Query = mongoose.model('queries');
    const queries = Query.find(query).cursor({ batchSize: 100 });

    await queries.eachAsync(async (q: any) => {
        await Query.update({ _id: q._id }, { $set: { type: 'inscriptos-vacunacion' } });
    });

    done();
}

export = run;
