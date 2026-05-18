import moment = require('moment');
import { Profesional } from '../core/tm/schemas/profesional';

const fsp = require('fs/promises');
const fileFecAlta = '../api/modules/matriculaciones/csv/profesionales-fechasAltas.csv';
const fileRevalidas = '../api/modules/matriculaciones/csv/profesionales-revalidas_completo.csv';

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

async function run(done) {

    const dataFechas = await fsp.readFile(fileFecAlta, { encoding: 'utf8' });
    const dataFechasArray: string[] = dataFechas.split(/\r?\n/);

    for (let i = 1; i < dataFechasArray.length; i++) {

        let rowFechasArray: string[] = dataFechasArray[i].split(',');
        const tipoDoc = rowFechasArray[0];
        const nroDoc = rowFechasArray[1];
        const especialidad = parseInt(rowFechasArray[3], 10);
        const fechasDeAlta: string[] = [];

        fechasDeAlta.push(rowFechasArray[4]);

        if (especialidad > 0) {
            for (let j = i + 1; j < dataFechasArray.length; j++) {
                rowFechasArray = dataFechasArray[j].split(',');
                if (rowFechasArray[0] === tipoDoc && rowFechasArray[1] === nroDoc && parseInt(rowFechasArray[3], 10) === especialidad) {
                    fechasDeAlta.push(rowFechasArray[4]);
                    i++;
                } else {
                    j = dataFechasArray.length;
                }
            }
        }

        const profesionalFind = Profesional.find({ documento: nroDoc, 'formacionPosgrado.especialidad.codigo.sisa': especialidad }).cursor({ batchSize: 100 });

        if (profesionalFind) {
            for await (const profesional of profesionalFind) {

                let upData = false;
                const profesionalId = profesional.id;
                const formacionPosgrado = profesional.formacionPosgrado;

                if (formacionPosgrado) {

                    for (const formacionposgrado of formacionPosgrado) {
                        if (formacionposgrado.especialidad.codigo.sisa === especialidad) {

                            let matriculaNumero: Number;
                            const matriculacionFix: Imatriculacion[] = [];

                            for (const matriculacion of formacionposgrado.matriculacion) {
                                matriculaNumero = matriculacion.matriculaNumero;
                                matriculacionFix.push(matriculacion);
                            }

                            for (const fechaDeAlta of fechasDeAlta) {
                                let match = false;
                                for (const matriculacion of matriculacionFix) {
                                    if (moment(fechaDeAlta).format('DD/MM/YYYY') === moment(matriculacion.fechaAlta).format('DD/MM/YYYY')) {
                                        match = true;
                                    }
                                }
                                if (!match) {
                                    const inicio = moment(fechaDeAlta).toDate();
                                    const periodos: Iperiodos[] = [];
                                    periodos.push({
                                        inicio,
                                        fin: moment(inicio).startOf('year').add(5, 'years').toDate(),
                                        notificacionVencimiento: null,
                                        revalidacionNumero: 0,
                                        revalida: false
                                    });
                                    matriculacionFix.push({
                                        matriculaNumero,
                                        fechaAlta: inicio,
                                        baja: { motivo: null, fecha: null },
                                        periodos
                                    });
                                    upData = true;
                                }
                            }
                            if (upData) {
                                matriculacionFix.sort(
                                    (a, b) => {
                                        if (a.fechaAlta > b.fechaAlta) {
                                            return 1;
                                        }
                                        if (a.fechaAlta < b.fechaAlta) {
                                            return -1;
                                        }
                                        return 0;
                                    }
                                );
                                formacionposgrado.matriculacion = matriculacionFix;
                            }
                        }
                    }
                    if (upData) {
                        await Profesional.findByIdAndUpdate(profesionalId, { $set: { formacionPosgrado } });
                    }
                }
            }
        }
    }

    const dataRevalidas = await fsp.readFile(fileRevalidas, { encoding: 'utf8' });
    const dataRevalidasArray: string[] = dataRevalidas.split(/\r?\n/);
    const init = 1;
    const upProf = true;

    for (let i = 1; i < dataRevalidasArray.length; i++) {

        let rowRevalidasArray: string[] = dataRevalidasArray[i].split(',');
        const tipoDoc = rowRevalidasArray[0];
        const nroDoc = rowRevalidasArray[1];
        const especialidad = parseInt(rowRevalidasArray[3], 10);
        const fechasRevalidas: string[] = [];

        fechasRevalidas.push(rowRevalidasArray[5] + '-01-01');

        if (especialidad > 0) {
            for (let j = i + 1; j < dataRevalidasArray.length; j++) {
                rowRevalidasArray = dataRevalidasArray[j].split(',');
                if (rowRevalidasArray[0] === tipoDoc && rowRevalidasArray[1] === nroDoc && parseInt(rowRevalidasArray[3], 10) === especialidad) {
                    fechasRevalidas.push(rowRevalidasArray[5] + '-01-01');
                    i++;
                } else {
                    j = dataRevalidasArray.length;
                }
            }
        }

        const profesionalFind = Profesional.find({ documento: nroDoc, 'formacionPosgrado.especialidad.codigo.sisa': especialidad }).cursor({ batchSize: 100 });

        if (profesionalFind) {
            for await (const profesional of profesionalFind) {

                let upData = false;
                const profesionalId = profesional.id;
                const formacionPosgrado = profesional.formacionPosgrado;

                if (formacionPosgrado) {

                    for (const formacionposgrado of formacionPosgrado) {

                        if (formacionposgrado.especialidad.codigo.sisa === especialidad) {

                            const cantMatriculaciones = formacionposgrado.matriculacion.length;
                            const fechasAltas: Date[] = [];

                            for (const matriculacion of formacionposgrado.matriculacion) {
                                fechasAltas.push(matriculacion.fechaAlta);
                            }

                            for (let k = 0; k < cantMatriculaciones; k++) {

                                const matriculacion = formacionposgrado.matriculacion[k];
                                const periodos: Iperiodos[] = [];

                                for (let p = 0; p < matriculacion.periodos.length; p++) {

                                    const periodo = matriculacion.periodos[p];

                                    if (!periodo.revalida) {
                                        if (moment(periodo.inicio).format('DD/MM/YYYY') === moment(matriculacion.fechaAlta).format('DD/MM/YYYY')) {
                                            periodos.push(periodo);
                                        }
                                    } else {
                                        let match = false;
                                        for (let j = 0; j < fechasRevalidas.length; j++) {
                                            const fin = moment(fechasRevalidas[j]).toDate();
                                            if (moment(fin).format('DD/MM/YYYY') === moment(periodo.fin).format('DD/MM/YYYY')) {
                                                match = true;
                                                j = fechasRevalidas.length;
                                            }
                                        }
                                        if (!match) {
                                            fechasRevalidas.push(moment(periodo.fin).format('YYYY-MM-DD'));
                                            upData = true;
                                        }
                                    }
                                }

                                fechasRevalidas.sort();
                                let revalidacionNumero = 0;

                                for (let j = 0; j < fechasRevalidas.length; j++) {
                                    const fin = moment(fechasRevalidas[j]).toDate();
                                    const inicio = moment(fin).subtract(5, 'years').toDate();

                                    if (cantMatriculaciones === 1 && moment(matriculacion.fechaAlta).startOf('year').toDate() <= moment(inicio).toDate() ||
                                        k === cantMatriculaciones - 1 && moment(matriculacion.fechaAlta).startOf('year').toDate() <= moment(inicio).toDate() ||
                                        k < cantMatriculaciones - 1 && moment(inicio).toDate() < moment(fechasAltas[k + 1]).toDate()) {
                                        revalidacionNumero++;
                                        periodos.push({
                                            inicio,
                                            fin,
                                            notificacionVencimiento: null,
                                            revalidacionNumero,
                                            revalida: true
                                        });
                                        upData = true;
                                    }
                                }
                                matriculacion.periodos = periodos;
                            }
                        }
                    }
                }
                if (upData && upProf) {
                    await Profesional.findByIdAndUpdate(profesionalId, { $set: { formacionPosgrado } });
                }
            }
        }
    }
    done();
}

export = run;
