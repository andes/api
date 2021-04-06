import * as moment from 'moment';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { InformacionExportada } from '../core/log/schemas/logExportaInformacion';
import { handleHttpRequest } from '../utils/requestHandler';
import { sisa } from './../config.private';

const urlSisa = sisa.url_nomivac;

export async function exportCovid19(done, horas, desde, hasta) {
    const start = desde ? moment(desde).toDate() : moment().subtract(horas, 'h').toDate();
    const end = hasta ? moment(hasta).toDate() : moment().toDate();
    const pipelineVacunaCovid19 = [
        {
            $match: {
                'ejecucion.fecha': {
                    $gte: start, $lte: end
                },
                'estadoActual.tipo': 'validada',
                'ejecucion.registros.concepto.conceptId': '840534001'

            }
        },
        {
            $project: {
                _id: 0,
                idPaciente: '$paciente.id',
                dni: '$paciente.documento',
                sexo: '$paciente.sexo',
                nombre: '$paciente.nombre',
                apellido: '$paciente.apellido',
                fechaNacimiento: '$paciente.fechaNacimiento',
                fecha: '$solicitud.fecha',
                idEfector: '$solicitud.organizacion.id',
                vacuna: '$ejecucion.registros.valor.vacuna'
            }
        },
        {
            $lookup: {
                from: 'organizacion',
                localField: 'idEfector',
                foreignField: '_id',
                as: 'organizacion'
            }
        },
        { $unwind: '$organizacion' },
        {
            $lookup: {
                from: 'paciente',
                localField: 'idPaciente',
                foreignField: '_id',
                as: 'dirPaciente'
            }
        },
        { $unwind: '$dirPaciente' },
        {
            $addFields: {
                direccion: {
                    $arrayElemAt: [
                        '$dirPaciente.direccion',
                        0
                    ]
                }
            }
        },
        {
            $project: {
                tipo: 'vacuna',
                idPaciente: '$idPaciente',
                dni: '$dni',
                sexo: '$sexo',
                nombre: '$nombre',
                apellido: '$apellido',
                direccion: '$direccion.valor',
                fechaNacimiento: {
                    $dateToString: {
                        date: '$fechaNacimiento',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
                fecha: {
                    $dateToString: {
                        date: '$fecha',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
                idEfector: '$idEfector',
                CodigoSisa: '$organizacion.codigo.sisa',
                vacunas: '$vacuna',
                fechaCarga: {
                    $dateToString: {
                        date: '$fecha',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
            }
        }
    ];
    const prestaciones = await Prestacion.aggregate(pipelineVacunaCovid19);
    for (let unaPrestacion of prestaciones) {
        const data = {
            ciudadano:
            {
                tipoDocumento: 1,
                numeroDocumento: unaPrestacion.dni,
                sexo: unaPrestacion.sexo === 'femenino' ? 'F' : (unaPrestacion.sexo === 'masculino') ? 'M' : '',
                nombre: unaPrestacion.nombre,
                apellido: unaPrestacion.apellido,
                fechaNacimiento: unaPrestacion.fechaNacimiento,
                calle: unaPrestacion.direccion ? unaPrestacion.direccion : '',
                pais: 200,
                provincia: 15,
                departamento: 365  // Confluencia, luego updetear por el que corresponda
            },
            aplicacionVacuna:
            {
                establecimiento: unaPrestacion.CodigoSisa,
                fechaAplicacion: unaPrestacion.vacunas[0].fechaAplicacion ? moment(unaPrestacion.vacunas[0].fechaAplicacion).format('DD-MM-YYYY') : null,
                lote: unaPrestacion.vacunas[0].lote,
                esquema: unaPrestacion.vacunas[0].esquema.codigo,
                condicionAplicacion: unaPrestacion.vacunas[0].condicion.codigo,
                vacuna: unaPrestacion.vacunas[0].vacuna.codigo,
                ordenDosis: unaPrestacion.vacunas[0].dosis.orden,
                referenciaSistemaProvincial: '32342'   // faltaría ver bien que es esto, aunque no es obligatorio
            }
        };
        const dto = {
            ciudadano: data.ciudadano,
            aplicacionVacuna: data.aplicacionVacuna
        };

        let log = {
            fecha: new Date(),
            sistema: 'Nomivac',
            key: unaPrestacion.tipo,
            idPaciente: unaPrestacion.idPaciente,
            info_enviada: data,
            resultado: {}
        };

        try {
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
            let info = new InformacionExportada(log);
            await info.save();

        } catch (error) {
            log.resultado = {
                resultado: 'ERROR_DE_ENVIO',
                status: 500,
                description: error.toString()
            };
            let info = new InformacionExportada(log);
            await info.save();
        }
    }
    done();
}
