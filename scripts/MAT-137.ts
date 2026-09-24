import { Profesional } from '../core/tm/schemas/profesional';
/**
 * MAT-137: renombra los campos de posgrado al nuevo esquema.
 * - formacionPosgrado[].revalida               -> renovacion
 * - formacionPosgrado[].matriculacion[].periodos[].revalida            -> renovacion
 * - formacionPosgrado[].matriculacion[].periodos[].revalidacionNumero  -> renovacionNumero
 */
async function run(done) {

    const actualizar = true;

    const profesionales = Profesional.find({
        formacionPosgrado: {
            $exists: true,
            $ne: null,
            $not: { $size: 0 }
        }
    }).lean().cursor({ batchSize: 100 });

    let cantProf = 0;
    let cantProfUp = 0;

    for await (const profesional of profesionales) {
        cantProf++;

        const formacionPosgrado = profesional.formacionPosgrado;
        let upProf = false;

        for (const formacion of formacionPosgrado) {
            if (!formacion) {
                continue;
            }

            if ('revalida' in formacion) {
                formacion.renovacion = formacion.revalida;
                delete formacion.revalida;
                upProf = true;
            }

            if (!Array.isArray(formacion.matriculacion)) {
                continue;
            }

            for (const matriculacion of formacion.matriculacion) {
                if (!matriculacion || !Array.isArray(matriculacion.periodos)) {
                    continue;
                }

                for (const periodo of matriculacion.periodos) {
                    if (!periodo) {
                        continue;
                    }
                    if ('revalida' in periodo) {
                        periodo.renovacion = periodo.revalida;
                        delete periodo.revalida;
                        upProf = true;
                    }
                    if ('revalidacionNumero' in periodo) {
                        periodo.renovacionNumero = periodo.revalidacionNumero;
                        delete periodo.revalidacionNumero;
                        upProf = true;
                    }
                }
            }
        }

        if (upProf) {
            if (actualizar) {
                await Profesional.findByIdAndUpdate(profesional._id, { $set: { formacionPosgrado } });
            }
            cantProfUp++;
        }
    }
    done();
}

export = run;
