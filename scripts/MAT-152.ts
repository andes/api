import { Profesional } from '../core/tm/schemas/profesional';
import { removeDiacritics } from '../utils/utils';
import entidadFormadora = require('../modules/matriculaciones/schemas/entidadFormadora');


async function run(done) {

    const listadoEntidadFormadora = await entidadFormadora.find({});
    const profesionalEntidadFormadora = Profesional.find({
        $and: [{ 'formacionGrado.entidadFormadora': { $ne: null } }, {
            $or: [{ 'formacionGrado.entidadFormadora._id': null }, { 'formacionGrado.entidadFormadora.nombre': null }, { 'formacionGrado.entidadFormadora.codigo': null }, { 'formacionGrado.entidadFormadora.habilitado': null }]
        }]
    }).cursor({ batchSize: 100 });

    let cantProf = 0;
    let cantProfUp = 0;
    let upProf = false;

    for await (const profesional of profesionalEntidadFormadora) {

        const profesionalId = profesional._id;
        const formacionGrado = profesional.formacionGrado;
        let cantFpg = 0;

        upProf = false;

        for (const formaciongrado of formacionGrado) {

            const profEntidadFormadora = formaciongrado.entidadFormadora;

            if (profEntidadFormadora.codigo > 0) {
                const entidad = listadoEntidadFormadora.find((e: any) => {
                    return e.codigo === profEntidadFormadora.codigo;
                });
                if (entidad) {
                    formaciongrado.entidadFormadora = entidad;
                    upProf = true;
                }
            } else {
                if (profEntidadFormadora.nombre != null) {

                    const entidad = listadoEntidadFormadora.find((e: any) => {
                        return removeDiacritics(e.nombre.replace('(R)', '').trim().toLocaleLowerCase()) === removeDiacritics(profEntidadFormadora.nombre.replace('(R)', '').trim().toLocaleLowerCase());
                    });

                    if (entidad) {
                        formaciongrado.entidadFormadora = entidad;
                        upProf = true;
                    }
                }
            }
            cantFpg++;
        }
        if (upProf) {
            await Profesional.findByIdAndUpdate(profesionalId, { $set: { formacionGrado } });
            cantProfUp++;
        }
        cantProf++;
    }
    done();
}


export = run;
