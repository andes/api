import * as moment from 'moment';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { InformacionExportada } from '../core/log/schemas/logExportaInformacion';
import { sisa } from './../config.private';


const nodeFetch = require('node-fetch');
const fs = require('fs');

const user = sisa.username;
const clave = sisa.password;
const urlSisa = sisa.url_nomivac;

export async function exportCovid19(done) {

    const start = moment(new Date().setHours(0, 0, 0, 0)).subtract(3,'d').format('YYYY-MM-DD HH:mm:ss');
    const end = moment(new Date().setHours(23, 59, 0, 0)).format('YYYY-MM-DD HH:mm:ss');

    const pipelineVacunaCovid19 = [
        {
            $match: {
                'solicitud.fecha': {
                    $gte: new Date(start), $lte: new Date(end)
                },
                'estadoActual.tipo': 'validada',
                'ejecucion.registros.concepto.conceptId': '840534001'
            
            }
        },
        {
            $sort: {
                'solicitud.fecha': 1
            }
        },
        {
            $project: {
                paciente: {
                    idPaciente: '$paciente.id',
                    dni: '$paciente.documento',
                    nombre: '$paciente.nombre',
                    apellido: '$paciente.apellido',
                    direccion: '$paciente.direccion.valor',
                    sexo: '$paciente.sexo',
                    fechaNacimiento: '$paciente.fechaNacimiento'
                },
                fecha: '$solicitud.fecha',
                idEfector: '$solicitud.organizacion.id',
                vacuna: '$ejecucion.registros.valor.vacuna'
            }
        },
        {
            $group: {
                _id: '$paciente',
                primeraPrestacion: {
                    $first: '$$ROOT'
                }
            }
        },
        {
            $project: {
                _id: 0,
                idPaciente: '$_id.idPaciente',
                dni: '$_id.dni',
                sexo: '$_id.sexo',
                nombre: '$_id.nombre',
                apellido: '$_id.apellido',
                direccion: '$_id.direccion',
                fechaNacimiento: '$_id.fechaNacimiento',
                fecha: '$primeraPrestacion.fecha',
                idEfector: '$primeraPrestacion.idEfector',
                vacuna: '$primeraPrestacion.vacuna'
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
        {
            $addFields: {
                organizacion: {
                    $arrayElemAt: [
                        '$organizacion',
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
                nombre:'$nombre',
                apellido:'$apellido',
                direccion: '$direccion',
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
    console.log(JSON.stringify(pipelineVacunaCovid19));
    let prestacionesVacunaContraCovid = await Prestacion.aggregate(pipelineVacunaCovid19);
    let prestaciones = [...prestacionesVacunaContraCovid];
    console.log('Cantidad de prestaciones encontradas: ', prestaciones.length);
    for (let unaPrestacion of prestaciones) {
        let data = {
            ciudadano:
                {
                    tipoDocumento:1,
                    numeroDocumento: unaPrestacion.dni,
                    sexo: unaPrestacion.sexo === 'femenino' ? 'F' : (unaPrestacion.sexo === 'masculino') ? 'M' : '',
                    nombre: unaPrestacion.nombre,
                    apellido: unaPrestacion.apellido,
                    fechaNacimiento: unaPrestacion.fechaNacimiento,
                    calle: unaPrestacion.direccion,
                    pais:200,
                    provincia:15,
                    departamento:365  // Confluencia
                },
            aplicacionVacuna:
                {
                    establecimiento: unaPrestacion.CodigoSisa,
                    fechaAplicacion: unaPrestacion.vacunas[0].fechaAplicacion,
                    lote: unaPrestacion.vacunas[0].lote,
                    esquema: unaPrestacion.vacunas[0].esquema,
                    condicionAplicacion: unaPrestacion.vacunas[0].condicion,
                    vacuna: unaPrestacion.vacunas[0].vacuna,
                    ordenDosis: unaPrestacion.vacunas[0].dosis,
                    referenciaSistemaProvincial :"32342"   // faltaría ver bien que es esto
                }
            }
        let dto = {
            usuario: user,
            clave,
            ciudadano: data.ciudadano,
            aplicaciones: data.aplicacionVacuna
        };

        console.log('Cada dto', dto);

        let log = {
            fecha: new Date(),
            sistema: 'Nomivac',
            key: unaPrestacion.tipo,
            idPaciente: unaPrestacion.idPaciente,
            info_enviada: data,
            resultado: {}
        };
        try {
            const response = await nodeFetch(urlSisa, { method: 'POST', body: JSON.stringify(dto), headers: { 'Content-Type': 'application/json' } });
            const resJson: any = await response.json();
            console.log('resultado del post: ', resJson);
            if (resJson) {
                log.resultado = {
                    resultado: resJson.resultado ? resJson.resultado : '',
                    id_caso: resJson.id_caso ? resJson.id_caso : '',
                    description: resJson.description ? resJson.description : ''
                };

            } else {
                log.resultado = {
                    resultado: 'ERROR_DE_ENVIO',
                    id_caso: '',
                    description: 'No se recibió ningún resultado'
                };
            }

            let info = new InformacionExportada(log);
            await info.save();

        } catch (error) {
            log.resultado = {
                resultado: 'ERROR_DE_ENVIO',
                id_caso: '',
                description: error.toString()
            };
            let info = new InformacionExportada(log);
            await info.save();
        }
    }
    done();
}