import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { sisa } from '../../../config.private';
import { matching } from '../../../core-v2/mpi/paciente/paciente.controller';
import { InformacionExportada } from '../../../core/log/schemas/logExportaInformacion';
import { Prestacion } from '../../../modules/rup/schemas/prestacion';
import { handleHttpRequest } from '../../../utils/requestHandler';
import { vacunas } from '../schemas/vacunas';
import { IPaciente } from './../../../core-v2/mpi/paciente/paciente.interface';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';

export async function getVacunas(paciente) {
    const conditions = {
        documento: paciente.documento
    };
    const sort = { fechaAplicacion: -1 };
    const resultados = await vacunas.find(conditions).sort(sort);
    resultados.forEach(async (vacuna: any, index) => {
        const pacienteVacuna: IPaciente = {
            nombre: vacuna.nombre,
            apellido: vacuna.apellido,
            documento: vacuna.documento,
            sexo: vacuna.sexo,
            fechaNacimiento: vacuna.fechaNacimiento,
            genero: vacuna.sexo,
            estado: 'temporal'
        };
        const resultadoMatching = await matching(paciente, pacienteVacuna);
        // no cumple con el numero del matching
        if (resultadoMatching < 0.90) {
            resultados.splice(index, 1);
        } else {
            vacuna.nombre = undefined;
            vacuna.apellido = undefined;
            vacuna.sexo = undefined;
            vacuna.documento = undefined;
            vacuna.fechaNacimiento = undefined;
        }
    });
    return resultados;
}

export async function exportCovid19(horas, pacienteId?, desde?, hasta?) {
    const urlSisa = sisa.url_nomivac;
    const start = desde ? moment(desde).toDate() : moment().subtract(horas, 'h').toDate();
    const end = hasta ? moment(hasta).toDate() : moment().toDate();
    const match = {
        'estadoActual.tipo': 'validada',
        'ejecucion.registros.concepto.conceptId': { $in: ['1821000246103', '840534001'] }
    };

    // Es necesario mantener este if por si la solicitud viene de monitoreo, en ese caso no usa filtro de fechas
    if (horas || desde && hasta) {
        match['ejecucion.fecha'] = { $gte: start, $lte: end };
    }

    if (pacienteId) {
        match['paciente.id'] = mongoose.Types.ObjectId(pacienteId);
    }

    if (!match['paciente.id'] && !match['ejecucion.fecha']) {
        throw new Error('exportCovid19 necesita paciente o fecha');
    }

    const pipelineVacunaCovid19 = [
        {
            $match: match
        },
        {
            $lookup: {
                from: 'organizacion',
                localField: 'solicitud.organizacion.id',
                foreignField: '_id',
                as: 'organizacion'
            }
        },
        { $unwind: '$organizacion' }
    ];
    const prestaciones = await Prestacion.aggregate(pipelineVacunaCovid19);
    for (const unaPrestacion of prestaciones) {
        const prestacionAux: any = new Prestacion(unaPrestacion);
        const registros = prestacionAux.getRegistros(true);
        const registroVacuna = registros.find(registro => registro.concepto.conceptId === '840534001'); // Me quedo con el registro de la vacuna
        let paciente: any = await Paciente.findById(unaPrestacion.paciente.id);
        if (!paciente.activo && paciente.idPacientePrincipal) {
            paciente = await Paciente.findById(paciente.idPacientePrincipal);
        }
        try {
            const data = {
                ciudadano:
                {
                    tipoDocumento: 1,
                    numeroDocumento: paciente.documento,
                    sexo: paciente.sexo === 'femenino' ? 'F' : (paciente.sexo === 'masculino') ? 'M' : '',
                    nombre: paciente.nombre,
                    apellido: paciente.apellido,
                    fechaNacimiento: moment(paciente.fechaNacimiento).format('DD-MM-YYYY'),
                    calle: paciente?.direccion[0]?.valor ? paciente.direccion[0].valor : 'No especifica',
                    pais: 200,
                    provincia: 15,
                    departamento: 365 // Confluencia, luego updetear por el que corresponda
                },
                aplicacionVacuna:
                {
                    establecimiento: unaPrestacion.organizacion.codigo.sisa,
                    fechaAplicacion: registroVacuna.valor.vacuna.fechaAplicacion ? moment(registroVacuna.valor.vacuna.fechaAplicacion).format('DD-MM-YYYY') : null,
                    lote: registroVacuna.valor.vacuna.lote,
                    esquema: registroVacuna.valor.vacuna.esquema.codigo,
                    condicionAplicacion: registroVacuna.valor.vacuna.condicion.codigo,
                    vacuna: registroVacuna.valor.vacuna.vacuna.codigo,
                    ordenDosis: registroVacuna.valor.vacuna.dosis.orden,
                    referenciaSistemaProvincial: '32342' // faltaría ver bien que es esto, aunque no es obligatorio
                }
            };
            const dto = {
                ciudadano: data.ciudadano,
                aplicacionVacuna: data.aplicacionVacuna
            };
            const log = {
                fecha: new Date(),
                sistema: 'Nomivac',
                key: 'vacuna',
                idPaciente: unaPrestacion.paciente.id,
                info_enviada: data,
                idPrestacion: unaPrestacion._id,
                resultado: {}
            };

            const options = {
                uri: urlSisa,
                method: 'POST',
                body: dto,
                headers: { APP_ID: sisa.APP_ID_ALTA, APP_KEY: sisa.APP_KEY_ALTA, 'Content-Type': 'application/json' },
                json: true,
            };
            const resJson = await handleHttpRequest(options);
            if (resJson && resJson.length > 0) {
                const code = resJson[0];
                const response = resJson[1];
                log.resultado = {
                    status: code ? code : '',
                    resultado: response.resultado ? response.resultado : '',
                    idSniAplicacion: response.idSniAplicacion ? response.idSniAplicacion : '',
                    description: response.description ? response.description : '',
                    error: response.errors ? response.errors : ''
                };

            } else {
                log.resultado = {
                    resultado: 'ERROR_DE_ENVIO',
                    status: '',
                    description: 'No se recibió ningún resultado'
                };
            }
            const info = new InformacionExportada(log);
            await info.save();

        } catch (error) {
            const logEspecial = {
                fecha: new Date(),
                sistema: 'Nomivac',
                key: 'vacuna',
                idPaciente: paciente.id,
                idPrestacion: unaPrestacion._id,
                resultado: {
                    resultado: 'ERROR EN LOS DATOS',
                    status: 500,
                    description: error
                }
            };
            const info = new InformacionExportada(logEspecial);
            await info.save();
        }
    }
}
