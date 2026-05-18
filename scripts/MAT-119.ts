import { Profesional } from '../core/tm/schemas/profesional';
import { SIISAObject, SIISAEspecialidad } from 'core/tm/schemas/siisa';
import * as moment from 'moment';

async function run(done) {

    interface Iperiodos {
        notificacionVencimiento: Boolean;
        inicio: Date;
        fin: Date;
        revalidacionNumero: Number;
        revalida: Boolean;
    };

    interface Imatriculacion {
        fechaAlta: Date;
        matriculaNumero: Number;
        baja: {
            motivo: String;
            fecha: Date;
        };
        periodos: Iperiodos[];
    };

    interface IformacionPosgrado {
        profesion: SIISAObject;
        institucionFormadora: SIISAObject;
        especialidad: SIISAEspecialidad;
        fechaIngreso: Date;
        fechaEgreso: Date;
        tituloFileId: String;
        observacion: String;
        certificacion: {
            fecha: Date;
            modalidad: SIISAObject;
            establecimiento: SIISAObject;
        };
        matriculacion: Imatriculacion[];
        matriculado: Boolean;
        revalida: Boolean;
        papelesVerificados: Boolean;
        fechaDeVencimiento: Date;
        exportadoSisa: Boolean;
        tieneVencimiento: Boolean;
        notas: [String];
    };

    const TotProf = await Profesional.aggregate([{ $count: 'Cant' }]);
    let totalProf: Number;
    for (const cp of TotProf) {
        totalProf = cp.Cant;
    }

    const actualizar = true;
    const diasAño = 365.25;
    const añosRevalida = 5 + 1;

    const profesionalMatriculado = Profesional.find(
        { 'formacionPosgrado.matriculacion': { $ne: null } }
    ).cursor({ batchSize: 100 });

    let cantProf = 0;
    let cantProfaAct = 0;
    let cantProfUp = 0;
    let upProf: boolean;

    for await (const profesional of profesionalMatriculado) {

        const profesionalId = profesional.id;
        const formacionPosgrado = profesional.formacionPosgrado;

        upProf = false;

        for (let i = 0; i < formacionPosgrado.length; i++) {

            const profMatriculacion = formacionPosgrado[i].matriculacion;
            const fechasDeAltas = formacionPosgrado[i].fechasDeAltas;
            const fechasAlta: Date[] = [];
            const periodos = [[]];

            if (fechasDeAltas) {
                for (const fechasdealtas of fechasDeAltas) {
                    fechasAlta.push(fechasdealtas.fecha ? moment(fechasdealtas.fecha).toDate() : null);
                }
            }

            let cantMatriculas = 0;
            let contMatriculas = 0;
            let nuevaCantMatriculas = 0;

            const inicio: Date[] = [];
            const fin: Date[] = [];
            const matriculaNumero: number[] = [];
            const bajaFecha: Date[] = [];
            const bajaMotivo: String[] = [];
            const notificacionVencimiento: boolean[] = [];

            for (const matriculacion of profMatriculacion) {

                if (matriculacion.periodos.length) {

                    matriculaNumero.push(matriculacion.matriculaNumero);

                    if (matriculacion.inicio) {
                        inicio.push(matriculacion.inicio);
                    } else {
                        inicio.push(fechasAlta[cantMatriculas]);
                    }

                    fin.push(matriculacion.fin ? moment(matriculacion.fin).toDate() : null);
                    bajaFecha.push(matriculacion.baja.fecha ? moment(matriculacion.baja.fecha).toDate() : null);
                    bajaMotivo.push(matriculacion.baja.motivo);
                    notificacionVencimiento.push(matriculacion.notificacionVencimiento ? matriculacion.notificacionVencimiento : false);

                    let años = 0;
                    let revalida = false;

                    if (cantMatriculas > 0) {
                        if (fechasAlta.length > 1) {
                            años = moment(fechasAlta[cantMatriculas]).diff(fechasAlta[cantMatriculas - 1], 'days') / diasAño;
                        } else {
                            años = moment(inicio[cantMatriculas]).diff(fechasAlta[cantMatriculas - 1], 'days') / diasAño;
                        }
                        if (años <= añosRevalida) {
                            revalida = true;
                        }
                    }

                    if (años <= añosRevalida) {
                        if (cantMatriculas === 0) {
                            periodos.push([]);
                        } else {
                            contMatriculas++;
                        }
                    } else {
                        matriculaNumero.push(matriculacion.matriculaNumero);
                        periodos.push([]);
                        contMatriculas = 0;
                        nuevaCantMatriculas++;
                    }

                    periodos[nuevaCantMatriculas].push(
                        {
                            notificacionVencimiento: notificacionVencimiento[cantMatriculas],
                            inicio: inicio[cantMatriculas],
                            fin: fin[cantMatriculas],
                            revalidacionNumero: contMatriculas,
                            revalida
                        }
                    );
                    cantMatriculas++;
                }
            }

            const nuevaMatriculacion: Imatriculacion[] = [];

            if (cantMatriculas > 0) {
                for (let mat = 0; mat <= nuevaCantMatriculas; mat++) {
                    nuevaMatriculacion.push(
                        {
                            matriculaNumero: matriculaNumero[mat],
                            fechaAlta: fechasAlta[mat] ? fechasAlta[mat] : inicio[mat],
                            baja:
                            {
                                fecha: bajaFecha[mat],
                                motivo: bajaMotivo[mat]
                            },
                            periodos: periodos[mat]
                        }
                    );
                }

                const nuevaFormacionPosgrado: IformacionPosgrado = {
                    profesion: formacionPosgrado[i].profesion,
                    institucionFormadora: formacionPosgrado[i].institucionFormadora,
                    especialidad: formacionPosgrado[i].especialidad,
                    fechaIngreso: formacionPosgrado[i].fechaIngreso,
                    fechaEgreso: formacionPosgrado[i].fechaEgreso,
                    tituloFileId: formacionPosgrado[i].tituloFileId,
                    observacion: formacionPosgrado[i].observacion,
                    certificacion: {
                        fecha: formacionPosgrado[i].certificacion.fecha,
                        modalidad: formacionPosgrado[i].certificacion.modalidad,
                        establecimiento: formacionPosgrado[i].certificacion.establecimiento,
                    },
                    matriculacion: nuevaMatriculacion,
                    matriculado: formacionPosgrado[i].matriculado,
                    revalida: formacionPosgrado[i].revalida,
                    papelesVerificados: formacionPosgrado[i].papelesVerificados,
                    fechaDeVencimiento: formacionPosgrado[i].fechaDeVencimiento,
                    exportadoSisa: formacionPosgrado[i].exportadoSisa,
                    tieneVencimiento: formacionPosgrado[i].tieneVencimiento,
                    notas: formacionPosgrado[i].notas,
                };

                formacionPosgrado[i] = nuevaFormacionPosgrado;
                upProf = true;

            }
        }

        if (upProf) {
            cantProfaAct++;
            if (actualizar) {
                await Profesional.findByIdAndUpdate(profesionalId, { $set: { formacionPosgrado } });
                cantProfUp++;
            }
        }
        cantProf++;
    }
    done();
}

export = run;
