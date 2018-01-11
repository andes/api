import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agendaModel from '../schemas/agenda';
import { toArray } from '../../../utils/utils';

function getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export function getDiagnosticos(params) {
    let resultados = [];
    let promises = [];
    return new Promise(async (resolve, reject) => {

        let pipeline = [];
        pipeline = [{
            $match: {
                'bloques.turnos.diagnostico.codificaciones.codificacionAuditoria': {
                    $exists: true, $ne: {}
                },
                'horaInicio': { '$gte': new Date(params.horaInicio) },
                'horaFin': { '$lte': new Date(params.horaFin) },
            }
        },
        {
            $unwind: '$bloques'
        },
        {
            $unwind: '$bloques.turnos'
        },
        {
            $unwind: '$bloques.turnos.diagnostico.codificaciones'
        },
        {
            $group: {
                _id: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.nombre',
                codigo: {
                    $first: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.codigo'
                },
                total: {
                    $sum: 1
                }
            }
        }
        ];
        let data = await toArray(agendaModel.aggregate(pipeline).cursor({}).exec());
        data.forEach(elem => {
            if (elem._id != null) {
                var sumaMenor1 = 0;
                var suma1 = 0;
                var sumaDosCuatro = 0;
                var sumaCincoNueve = 0;
                var suma1014 = 0;
                var suma1524 = 0;
                var suma2534 = 0;
                var suma3544 = 0;
                var suma4564 = 0;
                var sumaMayor65 = 0;
                var sumaMasculino = 0;
                var sumaFemenino = 0;
                var sumaOtro = 0;
                promises.push(new Promise((resolve1, reject1) => {

                    agendaModel.find({
                        'bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.codigo': {
                            $eq: elem.codigo
                        }
                    }).exec((err, agenda) => {
                        if (!agenda || err) {
                            return reject(err);
                        }

                        agenda.forEach((ag: any, index) => {
                            ag.bloques.forEach(bloque => {
                                bloque.turnos.forEach(turno => {
                                    var codigos = turno.diagnostico.codificaciones;
                                    codigos.forEach(function (codigo) {
                                        if (codigo.codificacionAuditoria) {
                                            if (elem.codigo === codigo.codificacionAuditoria.codigo) {
                                                var edad = getAge(turno.paciente.fechaNacimiento);
                                                var sexo = turno.paciente.sexo;
                                                if (edad < 1) {
                                                    sumaMenor1++;
                                                }
                                                if (edad === 1) {
                                                    suma1++;
                                                }
                                                if (edad >= 2 && edad <= 4) {
                                                    sumaDosCuatro++;
                                                }
                                                if (edad >= 5 && edad <= 9) {
                                                    sumaCincoNueve++;
                                                }
                                                if (edad >= 10 && edad <= 14) {
                                                    suma1014++;
                                                }
                                                if (edad >= 15 && edad <= 24) {
                                                    suma1524++;
                                                }
                                                if (edad >= 25 && edad <= 34) {
                                                    suma2534++;
                                                }
                                                if (edad >= 35 && edad <= 44) {
                                                    suma3544++;
                                                }
                                                if (edad >= 45 && edad <= 64) {
                                                    suma4564++;
                                                }
                                                if (edad > 65) {
                                                    sumaMayor65++;
                                                }
                                                if (sexo === 'masculino') {
                                                    sumaMasculino++;
                                                }
                                                if (sexo === 'femenino') {
                                                    sumaFemenino++;
                                                }
                                                if (sexo === 'otro') {
                                                    sumaOtro++;
                                                }
                                            }
                                        }
                                    });
                                });
                            });
                        });
                        elem['descripcion'] = elem['_id'];
                        let resultado = elem;
                        resultado['sumaMenor1'] = sumaMenor1;
                        resultado['suma1'] = suma1;
                        resultado['sumaDosCuatro'] = sumaDosCuatro;
                        resultado['sumaCincoNueve'] = sumaCincoNueve;
                        resultado['suma1014'] = suma1014;
                        resultado['suma1524'] = suma1524;
                        resultado['suma2534'] = suma2534;
                        resultado['suma3544'] = suma3544;
                        resultado['suma4564'] = suma4564;
                        resultado['sumaMayor65'] = sumaMayor65;
                        resultado['sumaMasculino'] = sumaMasculino;
                        resultado['sumaFemenino'] = sumaFemenino;
                        resultado['sumaOtro'] = sumaOtro;
                        resultados.push(resultado);
                        // console.log(elem.codigo + " | " + elem._id + " | " + elem.total);
                        // console.log('<1: ' + sumaMenor1 + ' | 1: ' + suma1 + ' | 2 a 4: ' + sumaDosCuatro + ' | 5 a 9: ' + sumaCincoNueve +
                        //     ' | 10 a 14: ' + suma1014 + ' | 15 a 24: ' + suma1524 + ' | 25 a 34: ' + suma2534 + ' | 35 a 44: ' + suma3544 +
                        //     ' | 45 a 64: ' + suma4564 + ' | 45 a 64: ' + suma4564 + ' | 65+: ' + sumaMayor65 +
                        //     ' | Masculino: ' + sumaMasculino + ' | Femenino: ' + sumaFemenino + ' | Indeterminado: ' + sumaOtro);
                        resolve();
                    });
                }));

            }
        });
        Promise.all(promises).then(() => {
            // console.log('resultadosController ', resultados);
            resolve(resultados);
        });
    });
}
