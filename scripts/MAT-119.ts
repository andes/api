import { Profesional } from '../core/tm/schemas/profesional';
import { matriculacionLog } from '../modules/matriculaciones/controller/matriculaciones.log';
import * as moment from 'moment';

async function run(done) {

    interface Iperiodos {
        notificacionVencimiento: Boolean;
        inicio: Date;
        fin: Date;
        renovacionNumero: Number;
        renovacion: Boolean;
    };

    interface Imatriculacion {
        fechaAlta: Date;
        matriculaNumero: Number;
        baja: {
            motivo: String;
            fecha: Date;
            usuario?: String;
        };
        folio: String;
        libro: String;
        periodos: Iperiodos[];
    };

    const profesionales = Profesional.find({
        formacionPosgrado: {
            $exists: true,
            $ne: null,
            $not: { $size: 0 }
        }
    }).lean().cursor({ batchSize: 100 });

    let cantProcesados = 0;
    let cantConCambios = 0;
    let cantErrores = 0;

    try {
        for await (const profesional of profesionales) {

            const profesionalId = profesional._id;
            const formacionPosgrado = profesional.formacionPosgrado;

            let upProf = false;

            try {
                for (let i = 0; i < formacionPosgrado.length; i++) {

                    const fp = formacionPosgrado[i];
                    if (!fp || !fp.matriculacion) {
                        continue;
                    }

                    // La matriculacion puede venir como objeto suelto por cómo se cargó históricamente
                    const profMatriculacion = Array.isArray(fp.matriculacion) ? fp.matriculacion : [fp.matriculacion];

                    // Si algún elemento ya tiene periodos, el posgrado ya está migrado y se ignora
                    const yaMigrado = profMatriculacion.some(m => m && Array.isArray(m.periodos) && m.periodos.length > 0);
                    if (yaMigrado) {
                        continue;
                    }

                    // Recolecta las altas desde fechasDeAltas
                    const fechasAlta: Date[] = [];
                    if (fp.fechasDeAltas && Array.isArray(fp.fechasDeAltas)) {
                        for (const fechasdealtas of fp.fechasDeAltas) {
                            if (fechasdealtas && fechasdealtas.fecha) {
                                fechasAlta.push(moment(fechasdealtas.fecha).toDate());
                            }
                        }
                    }

                    // Matrícula de referencia: sus datos (numero, libro, folio, baja) se reusan en todas las altas
                    const referencia = profMatriculacion[profMatriculacion.length - 1] || null;

                    // Sin altas, se usa una sola alta implícita con el inicio de la matrícula actual
                    if (fechasAlta.length === 0) {
                        if (referencia && referencia.inicio) {
                            fechasAlta.push(moment(referencia.inicio).toDate());
                        } else {
                            continue;
                        }
                    }

                    const nuevaMatriculacion: Imatriculacion[] = [];

                    // Una entrada de matriculacion por cada alta
                    for (let idx = 0; idx < fechasAlta.length; idx++) {
                        const esUltima = idx === fechasAlta.length - 1;
                        const fechaAlta = fechasAlta[idx];

                        // La última alta arma sus periodos con las matrículas legacy (renovaciones),
                        // las altas anteriores llevan un único periodo inicial de 5 años
                        const periodos: Iperiodos[] = (esUltima && profMatriculacion.length > 0)
                            ? profMatriculacion.map((m, j) => ({
                                notificacionVencimiento: m.notificacionVencimiento ? true : false,
                                inicio: m.inicio ? moment(m.inicio).toDate() : (j === 0 ? fechaAlta : null),
                                fin: m.fin ? moment(m.fin).toDate() : null,
                                renovacionNumero: j,
                                renovacion: j > 0
                            }))
                            : [{
                                notificacionVencimiento: false,
                                inicio: fechaAlta,
                                fin: moment(fechaAlta).add(5, 'years').toDate(),
                                renovacionNumero: 0,
                                renovacion: false
                            }];

                        nuevaMatriculacion.push({
                            fechaAlta,
                            matriculaNumero: referencia?.matriculaNumero ?? null,
                            baja: {
                                fecha: referencia?.baja?.fecha ? referencia.baja.fecha : null,
                                motivo: referencia?.baja?.motivo ? referencia.baja.motivo : null
                            },
                            folio: referencia?.folio ?? null,
                            libro: referencia?.libro ?? null,
                            periodos
                        });
                    }

                    // Reconstruye el posgrado sin los campos legacy
                    const nuevoFp: any = {
                        ...fp,
                        matriculacion: nuevaMatriculacion
                    };
                    delete nuevoFp.renovacion;
                    delete nuevoFp.fechaDeVencimiento;
                    delete nuevoFp.revalida;
                    delete nuevoFp.fechasDeAltas;

                    formacionPosgrado[i] = nuevoFp;
                    upProf = true;
                }
            } catch (err) {
                cantErrores++;
                await matriculacionLog.error(
                    'matriculaciones:MAT-119:formacionPosgrado',
                    { _id: profesionalId, profesionalId },
                    err
                );
                continue;
            }

            cantProcesados++;

            if (upProf) {
                cantConCambios++;
                await Profesional.findByIdAndUpdate(profesionalId, { $set: { formacionPosgrado } });
            }
        }
    } catch (err) {
        cantErrores++;
        await matriculacionLog.error(
            'matriculaciones:MAT-119',
            null,
            err
        );
    }
    done();
}

export = run;
