import { Profesional } from '../core/tm/schemas/profesional';
import { Especialidad, SIISAEspecialidad } from '../core/tm/schemas/siisa';
import { removeDiacritics } from '../utils/utils';

async function run(done) {

    const TotProf = await Profesional.aggregate([{ $count: 'Cant' }]);
    let totalProf: Number;
    for (const cp of TotProf) {
        totalProf = cp.Cant;
    }

    const listadoEspecialidades = await Especialidad.find({});
    const profesionalEspecialidad = Profesional.find({
        $and: [{ 'formacionPosgrado.especialidad': { $ne: null } }, {
            $or: [{ 'formacionPosgrado.especialidad._id': null }, { 'formacionPosgrado.especialidad.codigo.sisa': null }, { 'formacionPosgrado.especialidad.habilitado': null }]
        }]
    }).cursor({ batchSize: 100 });

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
                const esp = listadoEspecialidades.find(e => e.codigo.sisa === profEspecialidad.codigo);

                if (esp) {
                    formacionposgrado.especialidad = esp;
                    upProf = true;
                }
            } else {
                if (profEspecialidad.nombre != null) {
                    const esp = listadoEspecialidades.find(e => removeDiacritics(e.nombre.replace('(R)', '').trim().toLocaleLowerCase()) === removeDiacritics(profEspecialidad.nombre.replace('(R)', '').trim().toLocaleLowerCase()));

                    if (esp) {
                        formacionposgrado.especialidad = esp;
                        upProf = true;
                    }
                }
            }
            cantFpg++;
        }
        if (upProf) {
            await Profesional.findByIdAndUpdate(profesionalId, { $set: { formacionPosgrado } });
            cantProfUp++;
        }
        cantProf++;
    }
    done();
}


export = run;
