import { Profesional } from '../core/tm/schemas/profesional';
import { Especialidad, SIISAEspecialidad } from '../core/tm/schemas/siisa';

async function run(done) {

    const TotProf = await Profesional.aggregate([{ $count: 'Cant' }]);
    let totalProf: Number;
    for (const cp of TotProf ) {
        totalProf = cp.Cant;
    }

    const profesionalEspecialidad = Profesional.find({ $and: [{ 'formacionPosgrado.especialidad': { $ne: null } },
                                                              { $or: [{ 'formacionPosgrado.especialidad._id': null },
                                                                      { 'formacionPosgrado.especialidad.codigo.sisa': null },
                                                                      { 'formacionPosgrado.especialidad.habilitado': null }] }] })
        .cursor({ batchSize: 100 });

    let cantProf = 0;
    let cantProfUp = 0;
    let upProf = false;

    for await (const profesional of profesionalEspecialidad) {

        const profesionalId = profesional.id;
        const formacionPosgrado = profesional.formacionPosgrado;
        let cantFpg = 0;

        upProf = false;

        for (const formacionposgrado of formacionPosgrado) {

            const profEspecialidad = formacionposgrado.especialidad;

            if (profEspecialidad.codigo > 0) {
                const esp: SIISAEspecialidad = await Especialidad.findOne({ 'codigo.sisa': profEspecialidad.codigo });
                if (esp) {
                    formacionposgrado.especialidad = esp;
                    upProf = true;
                }
            } else {
                if (profEspecialidad.nombre != null) {
                    const regexNombre = (value) => new RegExp(['^', value, '$'].join(''), 'i');
                    const params = {
                        nombre: regexNombre(replSpecialChr(profEspecialidad.nombre))
                    };
                    const esp: SIISAEspecialidad = await Especialidad.findOne(params);
                    if (esp) {
                        formacionposgrado.especialidad = esp;
                        upProf = true;
                    }
                }
            }
            cantFpg++;
        }
        if (upProf) {
            await Profesional.findByIdAndUpdate( profesionalId, { $set: { formacionPosgrado } });
            cantProfUp++;
        }
        cantProf++;
    }
    done();
}

function replSpecialChr(texto: string) {
    let textoReplace = texto.replace(/\(/g, '.');
    textoReplace = textoReplace.replace(/\)/g, '.');
    return textoReplace;
}

export = run;
