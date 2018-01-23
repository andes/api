import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agendaModel from '../schemas/agenda';
import { toArray } from '../../../utils/utils';

function getAge(dateString) {
    let today = new Date();
    let birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    let m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

function sumarCodigos(codigos) {
    function getSum(total, num) {
        return total + num;
    }
    let respuesta = {
        codigo: codigos[0].causa,
        nombre: codigos[0].reporteC2,
        reporteC2: codigos[0].reporteC2,
        causa: codigos[0].causa,
        sumaMenor1: codigos.map(c => { return c.sumaMenor1; }).reduce(getSum, 0),
        suma1: codigos.map(c => { return c.suma1; }).reduce(getSum, 0),
        suma24: codigos.map(c => { return c.suma24; }).reduce(getSum, 0),
        suma59: codigos.map(c => { return c.suma59; }).reduce(getSum, 0),
        suma1014: codigos.map(c => { return c.suma1014; }).reduce(getSum, 0),
        suma1524: codigos.map(c => { return c.suma1524; }).reduce(getSum, 0),
        suma2534: codigos.map(c => { return c.suma2534; }).reduce(getSum, 0),
        suma3544: codigos.map(c => { return c.suma3544; }).reduce(getSum, 0),
        suma4564: codigos.map(c => { return c.suma4564; }).reduce(getSum, 0),
        sumaMayor65: codigos.map(c => { return c.sumaMayor65; }).reduce(getSum, 0),
        sumaMasculino: codigos.map(c => { return c.sumaMasculino; }).reduce(getSum, 0),
        sumaFemenino: codigos.map(c => { return c.sumaFemenino; }).reduce(getSum, 0),
        sumaOtro: codigos.map(c => { return c.sumaOtro; }).reduce(getSum, 0),
        total: codigos.map(c => { return c.total; }).reduce(getSum, 0),
    };
    return respuesta;
}

export function getDiagnosticos(params) {
    let resultados = [];
    let promises = [];
    return new Promise(async (resolve, reject) => {
        // Se buscan las agendas que tengan turnos o sobreturnos codificados con algun diagnostico c2
        let pipeline = [];
        pipeline = [{
            $match: {
                $or: [
                    {
                        'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria': { $exists: true, $ne: {} },
                        'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true
                    },
                    {
                        'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria': { $exists: true, $ne: {} },
                        'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true
                    }
                ],
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
                causa: {
                    $first: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.causa'
                },
                reporteC2: {
                    $first: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria.reporteC2'
                }
            }
        }
        ];
        let data = await toArray(agendaModel.aggregate(pipeline).cursor({}).exec());
        data.forEach(elem => {
            if (elem._id != null) {
                // Se definen variables cuantificadoras
                let sumaMenor1 = {
                    default: 0,
                    botulismo: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma1 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma24 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma59 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma1014 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma1524 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma2534 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma3544 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let suma4564 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let sumaMayor65 = {
                    default: 0,
                    meningitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0
                };
                let sumaMasculino = {
                    default: 0,
                    botulismo: 0,
                    meningitis: 0,
                };
                let sumaFemenino = {
                    default: 0,
                    botulismo: 0,
                    meningitis: 0,
                };
                let sumaOtro = {
                    default: 0,
                    botulismo: 0,
                    meningitis: 0,
                };
                let sifilisTemprana = {
                    masculino: 0,
                    femenino: 0,
                    total: 0
                };
                let sifilisSinEspecificar = {
                    masculino: 0,
                    femenino: 0,
                    total: 0
                };
                let sumaMeningitis = 0;
                let otroLactante = 0;
                let otroMeningitis = 0;
                promises.push(new Promise((resolve1, reject1) => {
                    agendaModel.find({
                        'horaInicio': { '$gte': new Date(params.horaInicio) },
                        'horaFin': { '$lte': new Date(params.horaFin) },
                        $or: [{
                            'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria.codigo': {
                                $eq: elem.codigo
                            }
                        }, {
                            'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria.codigo': {
                                $eq: elem.codigo
                            }
                        }]
                    }).exec((err, agenda) => {
                        function sumaSexo(sexo, tipo) {
                            switch (sexo) {
                                case 'masculino':
                                    if (tipo === 'meningitis') {
                                        sumaMasculino.meningitis++;
                                    }
                                    if (tipo === 'sifilisTemprana') {
                                        sifilisTemprana.masculino++;
                                    }
                                    if (tipo === 'sifilisSE') {
                                        sifilisSinEspecificar.masculino++;
                                    }
                                    break;
                                case 'femenino':
                                    if (tipo === 'meningitis') {
                                        sumaFemenino.meningitis++;
                                    }
                                    if (tipo === 'sifilisTemprana') {
                                        sifilisTemprana.femenino++;
                                    }
                                    if (tipo === 'sifilisSE') {
                                        sifilisSinEspecificar.femenino++;
                                    }
                                    break;
                                case 'otro':
                                    if (tipo === 'meningitis') {
                                        sumaOtro.meningitis++;
                                    }
                                    break;
                            }
                        }
                        function calcularContadores(edad, sexo) {
                            if (edad < 5) {
                                if (edad < 1) {
                                    if (elem.codigo === 'A05.1') { // Botulismo
                                        sumaMenor1.botulismo++;
                                        switch (sexo) {
                                            case 'masculino':
                                                sumaMasculino.botulismo++;
                                                break;
                                            case 'femenino':
                                                sumaFemenino.botulismo++;
                                                break;
                                            case 'otro':
                                                otroLactante++;
                                                break;
                                        }
                                    } else {
                                        if (elem.codigo === 'A17.0') {  // Meningitis Tuberculosa
                                            sumaMeningitis++;
                                            sumaMenor1.meningitis++;
                                            sumaSexo(sexo, 'meningitis');
                                        } else {
                                            if (elem.causa === 'A51') { // Sífilis temprana
                                                if (sexo === 'femenino') {
                                                    sumaMenor1.sifilisTempranaFemenino++;
                                                } else {
                                                    sumaMenor1.sifilisTempranaMasculino++;
                                                }
                                                sumaSexo(sexo, 'sifilisTemprana');
                                            } else {
                                                if (elem.causa === 'A52' || elem.causa === 'A53') {
                                                    if (sexo === 'femenino') {
                                                        sumaMenor1.sifilisSEFemenino++;
                                                    } else {
                                                        sumaMenor1.sifilisSEMasculino++;
                                                    }
                                                    sumaSexo(sexo, 'sifilisSE');
                                                } else {
                                                    sumaMenor1.default++;
                                                }
                                            }
                                        }
                                    }
                                }
                                if (edad === 1) {
                                    if (elem.codigo === 'A17.0') {  // Meningitis Tuberculosa
                                        sumaMeningitis++;
                                        suma1.meningitis++;
                                        sumaSexo(sexo, 'meningitis');
                                    } else {
                                        if (elem.causa === 'A51') { // Sífilis Temprana
                                            if (sexo === 'femenino') {
                                                suma1.sifilisTempranaFemenino++;
                                            } else {
                                                suma1.sifilisTempranaMasculino++;
                                            }
                                            sumaSexo(sexo, 'sifilisTemprana');
                                        } else {
                                            if (elem.causa === 'A52' || elem.causa === 'A53') {
                                                if (sexo === 'femenino') {
                                                    suma1.sifilisSEFemenino++;
                                                } else {
                                                    suma1.sifilisSEMasculino++;
                                                }
                                                sumaSexo(sexo, 'sifilisSE');
                                            } else {
                                                suma1.default++;
                                            }
                                        }
                                    }
                                }
                                if (edad >= 2 && edad <= 4) {
                                    if (elem.codigo === 'A17.0') {  // Meningitis Tuberculosa
                                        sumaMeningitis++;
                                        suma24.meningitis++;
                                        sumaSexo(sexo, 'meningitis');
                                    } else {
                                        if (elem.causa === 'A51') { // Sífilis Temprana
                                            if (sexo === 'femenino') {
                                                suma24.sifilisTempranaFemenino++;
                                            } else {
                                                suma24.sifilisTempranaMasculino++;
                                            }
                                            sumaSexo(sexo, 'sifilisTemprana');
                                        } else {
                                            if (elem.causa === 'A52' || elem.causa === 'A53') {
                                                if (sexo === 'femenino') {
                                                    suma24.sifilisSEFemenino++;
                                                } else {
                                                    suma24.sifilisSEMasculino++;
                                                }
                                                sumaSexo(sexo, 'sifilisSE');
                                            } else {
                                                suma24.default++;
                                            }
                                        }
                                    }
                                }
                            }
                            if (edad >= 5 && edad <= 9) {
                                if (elem.causa === 'A51') {
                                    if (sexo === 'femenino') {
                                        suma59.sifilisTempranaFemenino++;
                                    } else {
                                        suma59.sifilisTempranaMasculino++;
                                    }
                                    sumaSexo(sexo, 'sifilisTemprana');
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sexo === 'femenino') {
                                            suma59.sifilisSEFemenino++;
                                        } else {
                                            suma59.sifilisSEMasculino++;
                                        }
                                        sumaSexo(sexo, 'sifilisSE');
                                    } else {
                                        suma59.default++;
                                    }
                                }
                            }
                            if (edad >= 10 && edad <= 14) {
                                if (elem.causa === 'A51') {
                                    if (sexo === 'femenino') {
                                        suma1014.sifilisTempranaFemenino++;
                                    } else {
                                        suma1014.sifilisTempranaMasculino++;
                                    }
                                    sumaSexo(sexo, 'sifilisTemprana');
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sexo === 'femenino') {
                                            suma1014.sifilisSEFemenino++;
                                        } else {
                                            suma1014.sifilisSEMasculino++;
                                        }
                                        sumaSexo(sexo, 'sifilisSE');
                                    } else {
                                        suma1014.default++;
                                    }
                                }
                            }
                            if (edad >= 15 && edad <= 24) {
                                if (elem.causa === 'A51') {
                                    if (sexo === 'femenino') {
                                        suma1524.sifilisTempranaFemenino++;
                                    } else {
                                        suma1524.sifilisTempranaMasculino++;
                                    }
                                    sumaSexo(sexo, 'sifilisTemprana');
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sexo === 'femenino') {
                                            suma1524.sifilisSEFemenino++;
                                        } else {
                                            suma1524.sifilisSEMasculino++;
                                        }
                                        sumaSexo(sexo, 'sifilisSE');
                                    } else {
                                        suma1524.default++;
                                    }
                                }
                            }
                            if (edad >= 25 && edad <= 34) {
                                if (elem.causa === 'A51') {
                                    if (sexo === 'femenino') {
                                        suma2534.sifilisTempranaFemenino++;
                                    } else {
                                        suma2534.sifilisTempranaMasculino++;
                                    }
                                    sumaSexo(sexo, 'sifilisTemprana');
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sexo === 'femenino') {
                                            suma2534.sifilisSEFemenino++;
                                        } else {
                                            suma2534.sifilisSEMasculino++;
                                        }
                                        sumaSexo(sexo, 'sifilisSE');
                                    } else {
                                        suma2534.default++;
                                    }
                                }
                            }
                            if (edad >= 35 && edad <= 44) {
                                if (elem.causa === 'A51') {
                                    if (sexo === 'femenino') {
                                        suma3544.sifilisTempranaFemenino++;
                                    } else {
                                        suma3544.sifilisTempranaMasculino++;
                                    }
                                    sumaSexo(sexo, 'sifilisTemprana');
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sexo === 'femenino') {
                                            suma3544.sifilisSEFemenino++;
                                        } else {
                                            suma3544.sifilisSEMasculino++;
                                        }
                                        sumaSexo(sexo, 'sifilisSE');
                                    } else {
                                        suma3544.default++;
                                    }
                                }
                            }
                            if (edad >= 45 && edad <= 64) {
                                if (elem.causa === 'A51') {
                                    if (sexo === 'femenino') {
                                        suma4564.sifilisTempranaFemenino++;
                                    } else {
                                        suma4564.sifilisTempranaMasculino++;
                                    }
                                    sumaSexo(sexo, 'sifilisTemprana');
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sexo === 'femenino') {
                                            suma4564.sifilisSEFemenino++;
                                        } else {
                                            suma4564.sifilisSEMasculino++;
                                        }
                                        sumaSexo(sexo, 'sifilisSE');
                                    } else {
                                        suma4564.default++;
                                    }
                                }
                            }
                            if (edad > 65) {
                                if (elem.causa === 'A51') {
                                    if (sexo === 'femenino') {
                                        sumaMayor65.sifilisTempranaFemenino++;
                                    } else {
                                        sumaMayor65.sifilisTempranaMasculino++;
                                    }
                                    sumaSexo(sexo, 'sifilisTemprana');
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sexo === 'femenino') {
                                            sumaMayor65.sifilisSEFemenino++;
                                        } else {
                                            sumaMayor65.sifilisSEMasculino++;
                                        }
                                        sumaSexo(sexo, 'sifilisSE');
                                    } else {
                                        sumaMayor65.default++;
                                    }
                                }
                            }
                            let codigoExcepcion = (elem.codigo === 'A05.1' && edad < 1) || (elem.codigo === 'A17.0' && edad < 5);
                            if (!codigoExcepcion && sexo === 'masculino') {
                                sumaMasculino.default++;
                            }
                            if (!codigoExcepcion && sexo === 'femenino') {
                                sumaFemenino.default++;
                            }
                            if (!codigoExcepcion && sexo === 'otro') {
                                sumaOtro.default++;
                            }
                        }
                        if (!agenda || err) {
                            return reject1(err);
                        }
                        agenda.forEach((ag: any, index) => {
                            // Se recorren los turnos de la agenda actual
                            ag.bloques.forEach(bloque => {
                                bloque.turnos.forEach(turno => {
                                    let codigos = turno.diagnostico.codificaciones;
                                    codigos.forEach(function (codigo) {
                                        if (codigo.codificacionAuditoria && codigo.codificacionAuditoria.c2 === true) {
                                            if (elem.codigo === codigo.codificacionAuditoria.codigo) {
                                                let edad = getAge(turno.paciente.fechaNacimiento);
                                                let sexo = turno.paciente.sexo;
                                                calcularContadores(edad, sexo);
                                            }
                                        }
                                    });
                                });
                            });

                            // Se recorren los sobreturnos de la agenda actual
                            ag.sobreturnos.forEach(sobreturno => {
                                if (sobreturno.diagnostico.codificaciones.length > 0) {

                                    let codigos = sobreturno.diagnostico.codificaciones;
                                    codigos.forEach(function (codigo) {
                                        if (codigo.codificacionAuditoria) {
                                            if (elem.codigo === codigo.codificacionAuditoria.codigo) {
                                                let edad = getAge(sobreturno.paciente.fechaNacimiento);
                                                let sexo = sobreturno.paciente.sexo;
                                                calcularContadores(edad, sexo);
                                            }
                                        }
                                    });
                                }
                            });
                        });

                        let sumaTotal = sumaMenor1.default + suma1.default + suma24.default + suma59.default + suma1014.default + suma1524.default + suma2534.default
                            + suma3544.default + suma4564.default + sumaMayor65.default;
                        let r2 = {
                            codigo: elem['codigo'],
                            nombre: elem['_id'],
                            reporteC2: elem['reporteC2'],
                            causa: elem['causa'],
                            sumaMenor1: sumaMenor1.default,
                            suma1: suma1.default,
                            suma24: suma24.default,
                            suma59: suma59.default,
                            suma1014: suma1014.default,
                            suma1524: suma1524.default,
                            suma2534: suma2534.default,
                            suma3544: suma3544.default,
                            suma4564: suma4564.default,
                            sumaMayor65: sumaMayor65.default,
                            sumaMasculino: sumaMasculino.default,
                            sumaFemenino: sumaFemenino.default,
                            sumaOtro: sumaOtro.default,
                            total: sumaTotal,
                        };
                        // Se asigna de esta manera para que sea otro objeto y no un puntero al mismo objeto
                        let r1 = Object.assign({}, r2);
                        if (elem['codigo'] === 'A05.1') { // Botulismo
                            let sumaResto = suma1.default + suma24.default + suma59.default + suma1014.default + suma1524.default + suma2534.default + suma3544.default
                                + suma4564.default + sumaMayor65.default;
                            if (sumaMenor1.botulismo > 0) { // Botulismo en lactantes (<1 año)
                                r1.reporteC2 = 'Botulismo del Lactante';
                                r1.sumaMenor1 = sumaMenor1.botulismo;
                                r1.suma1 = 0;
                                r1.suma24 = 0;
                                r1.suma59 = 0;
                                r1.suma1014 = 0;
                                r1.suma1524 = 0;
                                r1.suma2534 = 0;
                                r1.suma3544 = 0;
                                r1.suma4564 = 0;
                                r1.sumaMayor65 = 0;
                                r1.sumaMasculino = sumaMasculino.botulismo;
                                r1.sumaFemenino = sumaFemenino.botulismo;
                                r1.sumaOtro = otroLactante;
                                r1.total = sumaMenor1.botulismo;
                                resultados.push(r1);
                            }
                            if (sumaResto > 0) { // Botulismo en no lactantes (>= 1 año)
                                resultados.push(r2);
                            }
                        } else { // No es Botulismo
                            if (elem['codigo'] === 'A17.0') { // Meningitis Tuberculosa
                                let sumaResto = suma59.default + suma1014.default + suma1524.default + suma2534.default + suma3544.default + suma4564.default + sumaMayor65.default;
                                if (sumaMeningitis > 0) { // Meningitis Tuberculosa en menores de 5 años
                                    r1.reporteC2 = 'Meningitis tuberculosa en menores de 5 años';
                                    r1.sumaMenor1 = sumaMenor1.meningitis;
                                    r1.suma1 = suma1.meningitis;
                                    r1.suma24 = suma24.meningitis;
                                    r1.suma59 = 0;
                                    r1.suma1014 = 0;
                                    r1.suma1524 = 0;
                                    r1.suma2534 = 0;
                                    r1.suma3544 = 0;
                                    r1.suma4564 = 0;
                                    r1.sumaMayor65 = 0;
                                    r1.sumaMasculino = sumaMasculino.meningitis;
                                    r1.sumaFemenino = sumaFemenino.meningitis;
                                    r1.sumaOtro = otroMeningitis;
                                    r1.total = sumaMeningitis;
                                    resultados.push(r1);
                                }
                                if (sumaResto > 0) {
                                    // Se asigna de esta manera para que sea otro objeto y no un puntero al mismo objeto
                                    let r3 = Object.assign({}, r2);
                                    r2.reporteC2 = 'Tuberculosis';
                                    resultados.push(r2);
                                    r3.reporteC2 = 'Meningitis bacteriana sin especificar agente';
                                    resultados.push(r3);
                                }
                            } else {
                                if (elem.causa === 'A51') {
                                    if (sifilisTemprana.femenino > 0) {
                                        r2.reporteC2 = 'Sífilis temprana en mujeres';
                                        r2.sumaMenor1 = sumaMenor1.sifilisTempranaFemenino;
                                        r2.suma1 = suma1.sifilisTempranaFemenino;
                                        r2.suma24 = suma24.sifilisTempranaFemenino;
                                        r2.suma59 = suma59.sifilisTempranaFemenino;
                                        r2.suma1014 = suma1014.sifilisTempranaFemenino;
                                        r2.suma1524 = suma1524.sifilisTempranaFemenino;
                                        r2.suma2534 = suma2534.sifilisTempranaFemenino;
                                        r2.suma3544 = suma3544.sifilisTempranaFemenino;
                                        r2.suma4564 = suma4564.sifilisTempranaFemenino;
                                        r2.sumaMayor65 = sumaMayor65.sifilisTempranaFemenino;
                                        r2.sumaFemenino = sifilisTemprana.femenino;
                                        r2.sumaMasculino = 0;
                                        r2.total = sifilisTemprana.femenino;
                                        resultados.push(r2);
                                    }
                                    if (sifilisTemprana.masculino > 0) {
                                        r1.reporteC2 = 'Sífilis temprana en hombres';
                                        r1.sumaMenor1 = sumaMenor1.sifilisTempranaMasculino;
                                        r1.suma1 = suma1.sifilisTempranaMasculino;
                                        r1.suma24 = suma24.sifilisTempranaMasculino;
                                        r1.suma59 = suma59.sifilisTempranaMasculino;
                                        r1.suma1014 = suma1014.sifilisTempranaMasculino;
                                        r1.suma1524 = suma1524.sifilisTempranaMasculino;
                                        r1.suma2534 = suma2534.sifilisTempranaMasculino;
                                        r1.suma3544 = suma3544.sifilisTempranaMasculino;
                                        r1.suma4564 = suma4564.sifilisTempranaMasculino;
                                        r1.sumaMayor65 = sumaMayor65.sifilisTempranaMasculino;
                                        r1.sumaFemenino = 0;
                                        r1.sumaMasculino = sifilisTemprana.masculino;
                                        r1.total = sifilisTemprana.masculino;
                                        resultados.push(r1);
                                    }
                                } else {
                                    if (elem.causa === 'A52' || elem.causa === 'A53') {
                                        if (sifilisSinEspecificar.femenino > 0) {
                                            r2.reporteC2 = 'Sífilis sin especificar en mujeres';
                                            r2.sumaMenor1 = sumaMenor1.sifilisSEFemenino;
                                            r2.suma1 = suma1.sifilisSEFemenino;
                                            r2.suma24 = suma24.sifilisSEFemenino;
                                            r2.suma59 = suma59.sifilisSEFemenino;
                                            r2.suma1014 = suma1014.sifilisSEFemenino;
                                            r2.suma1524 = suma1524.sifilisSEFemenino;
                                            r2.suma2534 = suma2534.sifilisSEFemenino;
                                            r2.suma3544 = suma3544.sifilisSEFemenino;
                                            r2.suma4564 = suma4564.sifilisSEFemenino;
                                            r2.sumaMayor65 = sumaMayor65.sifilisSEFemenino;
                                            r2.sumaFemenino = sifilisSinEspecificar.femenino;
                                            r2.sumaMasculino = 0;
                                            r2.total = sifilisSinEspecificar.femenino;
                                            resultados.push(r2);
                                        }
                                        if (sifilisSinEspecificar.masculino > 0) {
                                            r1.reporteC2 = 'Sífilis sin especificar en hombres';
                                            r1.sumaMenor1 = sumaMenor1.sifilisSEMasculino;
                                            r1.suma1 = suma1.sifilisSEMasculino;
                                            r1.suma24 = suma24.sifilisSEMasculino;
                                            r1.suma59 = suma59.sifilisSEMasculino;
                                            r1.suma1014 = suma1014.sifilisSEMasculino;
                                            r1.suma1524 = suma1524.sifilisSEMasculino;
                                            r1.suma2534 = suma2534.sifilisSEMasculino;
                                            r1.suma3544 = suma3544.sifilisSEMasculino;
                                            r1.suma4564 = suma4564.sifilisSEMasculino;
                                            r1.sumaMayor65 = sumaMayor65.sifilisSEMasculino;
                                            r1.sumaFemenino = 0;
                                            r1.sumaMasculino = sifilisSinEspecificar.masculino;
                                            r1.total = sifilisSinEspecificar.masculino;
                                            resultados.push(r1);
                                        }
                                    } else {
                                        if (sumaTotal > 0) {
                                            resultados.push(r2);
                                        }
                                    }
                                }
                            }
                        }
                        resolve1();
                    });
                }));

            }
        });

        Promise.all(promises).then(() => {

            let sortResultados = function (a, b) {
                if (a.codigo < b.codigo) {
                    return -1;
                }
                if (a.codigo > b.codigo) {
                    return 1;
                }
                return 0;
            };
            // Se agrupan los códigos correspondientes a Sífilis temprana (causa A51) en sexos
            let sifilisTempranaFemenino = resultados.filter(resultado => {
                return (resultado.causa === 'A51' && resultado.sumaFemenino > 0);
            });
            if (sifilisTempranaFemenino.length > 0) {
                let STF = sumarCodigos(sifilisTempranaFemenino);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.causa === 'A51' && resultado.sumaFemenino > 0));
                });
                resultados.push(STF);
            }
            let sifilisTempranaMasculino = resultados.filter(resultado => {
                return (resultado.causa === 'A51' && resultado.sumaMasculino > 0);
            });
            if (sifilisTempranaMasculino.length > 0) {
                let STM = sumarCodigos(sifilisTempranaMasculino);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.causa === 'A51' && resultado.sumaMasculino > 0));
                });
                resultados.push(STM);
            }

            // Se agrupan los códigos correspondientes a sífilis sin especificar (causa A52 y A53) en sexos
            let sifilisSEFemenino = resultados.filter(resultado => {
                return ((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaFemenino > 0);
            });
            if (sifilisSEFemenino.length > 0) {
                let SSEF = sumarCodigos(sifilisSEFemenino);
                resultados = resultados.filter(resultado => {
                    return (!((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaFemenino > 0));
                });
                resultados.push(SSEF);
            }
            let sifilisSEMasculino = resultados.filter(resultado => {
                return ((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaMasculino > 0);
            });
            if (sifilisSEMasculino.length > 0) {
                let SSEM = sumarCodigos(sifilisSEMasculino);
                resultados = resultados.filter(resultado => {
                    return (!((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaMasculino > 0));
                });
                resultados.push(SSEM);
            }

            resultados.sort(sortResultados);
            resolve(resultados);
        });
    });
}
