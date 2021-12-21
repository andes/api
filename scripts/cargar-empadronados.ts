import * as moment from 'moment';
import { Paciente } from '../core-v2/mpi/paciente/paciente.schema';
import { PacientesEmpadronados } from '../core-v2/mpi/pacientes-empadronados/pacientes-empadronados.schema';
import { getOSPuco } from '../modules/obraSocial/controller/puco';
import { getPacienteSumar } from '../modules/obraSocial/controller/sumar';
import { ObraSocial } from '../modules/obraSocial/schemas/obraSocial';

async function run(done) {
    const desde = process.argv[3];
    const hasta = process.argv[4];
    const start = moment(desde).toDate();
    const end = moment(hasta).toDate();
    // await PacientesEmpadronados.deleteMany({
    //     createdAt: { $gte: start, $lte: end }
    // });
    const pacientes = await Paciente.find({
        createdAt: { $gte: start, $lte: end }
    });
    for (const paciente of pacientes) {
        const datos: any = {};
        datos.nombre = paciente.nombre;
        datos.apellido = paciente.apellido;
        datos.documento = paciente.documento;
        datos.fechaNacimiento = paciente.fechaNacimiento;
        datos.pais = 'Argentina';
        datos.createdAt = paciente.createdAt;
        const datosPuco = await getOSPuco(paciente.documento, paciente.sexo);
        if (datosPuco.length < 1) {
            const datosSumar = await getPacienteSumar(paciente.documento);
            if (datosSumar.length < 1) {
                datos.financiador = { codigoPuco: null, nombre: 'Sin Obra Social', financiador: '' };
                datos.codigoSisaEmpadronamiento = '';
            } else {
                const empadronado = datosSumar[0];
                datos.financiador = { codigoPuco: null, nombre: 'SUMAR', financiador: 'SUMAR' };
                datos.fechaEmpadronamiento = empadronado.fechainscripcion;
                datos.codigoSisaEmpadronamiento = '10580352167033';
            }
        } else {
            const empadronado = datosPuco[0];
            datos.fechaEmpadronamiento = empadronado.version;
            datos.codigoSisaEmpadronamiento = '10580352167033';
            const obraSocial = await ObraSocial.findOne({ codigoPuco: empadronado.codigoOS });
            datos.financiador = obraSocial;
        };
        const pacienteEmpadronado = new PacientesEmpadronados(datos);
        await pacienteEmpadronado.save();
    };
    done();
}

export = run;
