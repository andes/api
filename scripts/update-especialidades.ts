import { Profesional } from './../core/tm/schemas/profesional';
import { Types } from 'mongoose';

async function run(done) {
    const profesionales: any = await Profesional.find({ 'formacionPosgrado.especialidad.nombre': 'MEDICINA GENERAL' });
    const updates = [];
    for (const profesional of profesionales) {
        const idProf = new Types.ObjectId(profesional.id);
        if (profesional.formacionPosgrado.length) {
            for (let pos = 0; pos < profesional.formacionPosgrado.length; pos++) {
                const posgrado = profesional.formacionPosgrado[pos];
                if (posgrado.especialidad.nombre === 'MEDICINA GENERAL') {
                    updates.push({
                        filter: { _id: idProf },
                        update: {
                            $set: {
                                [`formacionPosgrado.${pos}.especialidad`]: {
                                    _id: new Types.ObjectId('5887705e69408d715ae4f62e'),
                                    nombre: 'Medicina General y/o Medicina de Familia',
                                    habilitado: true,
                                    codigo: {
                                        sisa: 2
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }
    }

    for (const update of updates) {
        await Profesional.update(update.filter, update.update);
    }
}

export = run;
