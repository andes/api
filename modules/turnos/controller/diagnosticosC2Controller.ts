import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agendaModel from '../schemas/agenda';
import { toArray } from '../../../utils/utils';
import * as codificacionModel from '../../rup/schemas/codificacion';

/*
function getAge(dateString) {
    let today = new Date();
    let birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    let m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
*/

function calculoEdad(dateString) {
    let edad: any;
    let fechaNac: any;
    const fechaActual: Date = new Date();
    let fechaAct: any;
    let difAnios: any;
    let difDias: any;
    let difMeses: any;
    let difHs: any;
    let difMn: any;

    fechaNac = moment(dateString, 'YYYY-MM-DD HH:mm:ss');
    fechaAct = moment(fechaActual, 'YYYY-MM-DD HH:mm:ss');
    difDias = fechaAct.diff(fechaNac, 'd'); // Diferencia en días
    difAnios = Math.floor(difDias / 365.25);
    difMeses = Math.floor(difDias / 30.4375);
    difHs = fechaAct.diff(fechaNac, 'h'); // Diferencia en horas
    difMn = fechaAct.diff(fechaNac, 'm'); // Diferencia en minutos

    if (difAnios !== 0) {
        edad = {
            valor: difAnios,
            unidad: 'años'
        };
    } else if (difMeses !== 0) {
        edad = {
            valor: difMeses,
            unidad: 'meses'
        };
    } else if (difDias !== 0) {
        edad = {
            valor: difDias,
            unidad: 'días'
        };
    } else if (difHs !== 0) {
        edad = {
            valor: difHs,
            unidad: 'horas'
        };
    } else if (difMn !== 0) {
        edad = {
            valor: difMn,
            unidad: 'minutos'
        };
    }

    return edad;
}
function sumarCodigos(codigos) {
    function getSum(total, num) {
        return total + num;
    }
    function concatArr(pacientes, rta) {
        return rta.concat(pacientes);
    }
    const respuesta = {
        codigo: codigos[0].causa,
        nombre: codigos[0].reporteC2,
        reporteC2: codigos[0].reporteC2,
        causa: codigos[0].causa,
        ficha: codigos[0].ficha,
        sumaMenor6m: codigos.map(c => { return c.sumaMenor6m; }).reduce(getSum, 0),
        suma711m: codigos.map(c => { return c.suma711m; }).reduce(getSum, 0),
        // sumaMenor1: codigos.map(c => { return c.sumaMenor1; }).reduce(getSum, 0),
        suma1: codigos.map(c => { return c.suma1; }).reduce(getSum, 0),
        suma24: codigos.map(c => { return c.suma24; }).reduce(getSum, 0),
        suma59: codigos.map(c => { return c.suma59; }).reduce(getSum, 0),
        suma1014: codigos.map(c => { return c.suma1014; }).reduce(getSum, 0),
        // suma1524: codigos.map(c => { return c.suma1524; }).reduce(getSum, 0),
        suma1519: codigos.map(c => { return c.suma1519; }).reduce(getSum, 0),
        suma2024: codigos.map(c => { return c.suma2024; }).reduce(getSum, 0),
        suma2534: codigos.map(c => { return c.suma2534; }).reduce(getSum, 0),
        suma3544: codigos.map(c => { return c.suma3544; }).reduce(getSum, 0),
        suma4564: codigos.map(c => { return c.suma4564; }).reduce(getSum, 0),
        suma6574: codigos.map(c => { return c.suma6574; }).reduce(getSum, 0),
        sumaMayor75: codigos.map(c => { return c.sumaMayor75; }).reduce(getSum, 0),
        sumaMasculino: codigos.map(c => { return c.sumaMasculino; }).reduce(getSum, 0),
        sumaFemenino: codigos.map(c => { return c.sumaFemenino; }).reduce(getSum, 0),
        sumaOtro: codigos.map(c => { return c.sumaOtro; }).reduce(getSum, 0),
        total: codigos.map(c => { return c.total; }).reduce(getSum, 0),
        pacientes: codigos.map(c => { return c.pacientes; }).reduce(concatArr, []),
    };
    return respuesta;
}

export function getDiagnosticos(params) {
    let resultados = [];
    const promises = [];
    return new Promise(async (resolve, reject) => {
        // Se buscan las agendas que tengan turnos o sobreturnos codificados con algun diagnostico c2
        let pipeline = [];
        pipeline = [{
            $match: {
                'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true,
                'bloques.turnos.diagnostico.codificaciones.0.primeraVez': true,
                horaInicio: { $gte: new Date(params.horaInicio) },
                horaFin: { $lte: new Date(params.horaFin) },
                'organizacion._id': { $eq: mongoose.Types.ObjectId(params.organizacion) }
            }
        },
        {
            $unwind: '$bloques'
        },
        {
            $unwind: '$bloques.turnos'
        },
        {
            $match: {
                'bloques.turnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true,
                'bloques.turnos.diagnostico.codificaciones.0.primeraVez': true,
                horaInicio: { $gte: new Date(params.horaInicio) },
                horaFin: { $lte: new Date(params.horaFin) },
                'organizacion._id': { $eq: mongoose.Types.ObjectId(params.organizacion) }
            }
        },

        {
            $project: {
                paciente: '$bloques.turnos.paciente',
                diagnosticoCodificaciones: '$bloqueTurnos.diagnostico.codificaciones',
                codificacionesAuditoria: '$bloques.turnos.diagnostico.codificaciones.codificacionAuditoria',
            }
        },
        {
            $unwind: '$codificacionesAuditoria'
        },
        {
            $match: {
                'codificacionesAuditoria.c2': true
            }
        },
        {
            $group: {
                _id: '$codificacionesAuditoria.nombre',
                codigo: {
                    $first: '$codificacionesAuditoria'
                },
                paciente: { $push: '$paciente' }
            }
        }];

        let pipeline1 = [];
        pipeline1 = [{
            $match: {
                'sobreturnos.diagnostico.codificaciones.0.codificacionAuditoria.c2': true,
                'sobreturnos.diagnostico.codificaciones.0.primeraVez': true,
                horaInicio: { $gte: new Date(params.horaInicio) },
                horaFin: { $lte: new Date(params.horaFin) },
                'organizacion._id': { $eq: mongoose.Types.ObjectId(params.organizacion) }
            }
        },
        {
            $unwind: '$sobreturnos'
        },
        {
            $unwind: '$sobreturnos.diagnostico.codificaciones'
        },
        {
            $match: {
                'sobreturnos.diagnostico.codificaciones.codificacionAuditoria.c2': true,
                'sobreturnos.diagnostico.codificaciones.primeraVez': true,
                horaInicio: { $gte: new Date(params.horaInicio) },
                horaFin: { $lte: new Date(params.horaFin) },
                'organizacion._id': { $eq: mongoose.Types.ObjectId(params.organizacion) }
            }
        },
        {
            $project: {
                paciente: '$sobreturnos.paciente',
                diagnosticoCodificaciones: '$sobreturnos.diagnostico.codificaciones',
                codificacionesAuditoria: '$sobreturnos.diagnostico.codificaciones.codificacionAuditoria',
            }
        },
        {
            $unwind: '$codificacionesAuditoria'
        },
        {
            $match: {
                'codificacionesAuditoria.c2': true
            }

        },
        {
            $group: {
                _id: '$codificacionesAuditoria.nombre',
                codigo: {
                    $first: '$codificacionesAuditoria'
                },
                paciente: { $push: '$paciente' }
            }
        }];

        // Se buscan las prestaciones fuera de agenda codificados con algun diagnostico c2
        let pipeline2 = [];
        pipeline2 = [
            {
                $match: {
                    'diagnostico.codificaciones.codificacionAuditoria': { $exists: true, $ne: {} },
                    'diagnostico.codificaciones.codificacionAuditoria.c2': true,
                    'diagnostico.codificaciones.primeraVez': true,
                }
            },
            {
                $lookup: {
                    from: 'prestaciones',
                    localField: 'idPrestacion',
                    foreignField: '_id',
                    as: 'prestacion'
                }
            },
            {
                $unwind: '$diagnostico.codificaciones'
            },
            {
                $unwind: '$prestacion',
            },
            {
                $match: {
                    'diagnostico.codificaciones.codificacionAuditoria': { $exists: true, $ne: {} },
                    'diagnostico.codificaciones.codificacionAuditoria.c2': true,
                    'diagnostico.codificaciones.primeraVez': true,
                    'prestacion.solicitud.organizacion.id': { $eq: mongoose.Types.ObjectId(params.organizacion) },
                    $and: [
                        { 'prestacion.solicitud.fecha': { $lte: new Date(params.horaFin) } },
                        { 'prestacion.solicitud.fecha': { $gte: new Date(params.horaInicio) } }
                    ]
                }
            },
            {
                $group: {
                    _id: '$diagnostico.codificaciones.codificacionAuditoria.nombre',
                    codigo: {
                        $first: '$diagnostico.codificaciones.codificacionAuditoria'
                    },
                    paciente: { $push: '$paciente' }
                },

            }
        ];

        let p1 = toArray(agendaModel.aggregate(pipeline).cursor({}).exec());
        let p2 = toArray(agendaModel.aggregate(pipeline1).cursor({}).exec());
        let p3 = toArray(codificacionModel.aggregate(pipeline2).cursor({}).exec());

        let [diagnosticosTurnos, diagnosticosSobreturnos, diagnosticosFueraAgenda] = await Promise.all([p1, p2, p3]);

        let diagnosticos = diagnosticosTurnos.concat(diagnosticosSobreturnos, diagnosticosFueraAgenda);

        let arr = [];
        // Se carga el arreglo arr con todos los reporte C2 de data, sin repetir.
        diagnosticos.forEach(e => {
            if (!arr.some(x => { return e.codigo.reporteC2 === x.codigo.reporteC2; })) {
                arr.push({ _id: e._id, codigo: e.codigo, paciente: [] });
            }
        });

        // A cada reporte C2 le carga los pacientes sin repetir
        diagnosticos.forEach(e => {
            let match = arr.filter(ee => ee.codigo.reporteC2 === e.codigo.reporteC2)[0];
            e.paciente.forEach(pac => {
                if (!match.paciente.some(pac2 => { return pac.documento === pac2.documento && pac.sexo === pac2.sexo; })) {
                    match.paciente.push(pac);
                }
            });
        });

        arr.forEach(elem => {
            if (elem._id != null) {
                // Se definen variables cuantificadoras
                const suma = {
                    default: 0,
                    botulismo: 0,
                    meningitis: 0,
                    poliomielitis: 0,
                    sifilisTempranaFemenino: 0,
                    sifilisTempranaMasculino: 0,
                    sifilisSEFemenino: 0,
                    sifilisSEMasculino: 0,
                    secrecionPurulentaFemenino: 0,
                    secrecionPurulentaMasculino: 0,
                    secrecionSEFemenino: 0,
                    secrecionSEMasculino: 0,
                    hiv: 0,
                    bronquiolitis: 0
                };
                const sumaMenor6m = { ...suma };
                const suma711m = { ...suma };
                const suma1 = { ...suma };
                const suma24 = { ...suma };
                const suma59 = { ...suma };
                const suma1014 = { ...suma };
                const suma1519 = { ...suma };
                const suma2024 = { ...suma };
                const suma2534 = { ...suma };
                const suma3544 = { ...suma };
                const suma4564 = { ...suma };
                const suma6574 = { ...suma };
                const sumaMayor75 = { ...suma };

                const sumaMasculino = {
                    default: 0,
                    botulismo: 0,
                    meningitis: 0,
                    poliomielitis: 0,
                    sifilisTemprana: 0,
                    sifilisSinEspecificar: 0,
                    secrecionPurulenta: 0,
                    secrecionSE: 0,
                    hiv: 0,
                    bronquiolitis: 0
                };
                const sumaFemenino = { ...sumaMasculino };

                const sumaOtro = {
                    default: 0,
                    botulismo: 0,
                    meningitis: 0,
                };
                let sumaMeningitis = 0;
                const otroLactante = 0;
                const otroMeningitis = 0;
                let poliomielitis = 0;
                let hiv = 0;
                let bronquiolitis = 0;
                const pacientes = {
                    hiv: [],
                    polio: [],
                    bronquiolitis: [],
                    default: [],
                    botulismo: [],
                    meningitis: [],
                    STF: [],
                    STM: [],
                    SSEF: [],
                    SSEM: [],
                    SECSEF: [],
                    SECSEM: [],
                    SECPF: [],
                    SECPM: []
                };

                function sumaSexo(sexo, tipo) {
                    switch (tipo) {
                        case 'botulismo':
                            sexo.botulismo++;
                            break;
                        case 'meningitis':
                            sexo.meningitis++;
                            break;
                        case 'sifilisTemprana':
                            sexo.sifilisTemprana++;
                            break;
                        case 'sifilisSE':
                            sexo.sifilisSinEspecificar++;
                            break;
                        case 'secrecionPurulenta':
                            sexo.secrecionPurulenta++;
                            break;
                        case 'secrecionSE':
                            sexo.secrecionSE++;
                            break;
                        case 'poliomielitis':
                            sexo.poliomielitis++;
                            break;
                        case 'hiv':
                            sexo.hiv++;
                            break;
                        case 'bronquiolitis':
                            sexo.bronquiolitis++;
                            break;
                    }
                }

                function actualizarContador(paciente, tipo) {
                    const edad = calculoEdad(paciente.fechaNacimiento);
                    const sexo = paciente.sexo;
                    switch (elem.codigo.causa) {
                        case 'A51': // Sífilis Temprana
                            if (sexo === 'femenino') {
                                tipo.sifilisTempranaFemenino++;
                                pacientes.STF.push(paciente);
                                sumaSexo(sumaFemenino, 'sifilisTemprana');
                            } else {
                                tipo.sifilisTempranaMasculino++;
                                pacientes.STM.push(paciente);
                                sumaSexo(sumaMasculino, 'sifilisTemprana');
                            }
                            break;
                        case 'A52' || 'A53': // Sífilis sin especificar
                            if (sexo === 'femenino') {
                                tipo.sifilisSEFemenino++;
                                pacientes.SSEF.push(paciente);
                                sumaSexo(sumaFemenino, 'sifilisSE');
                            } else {
                                tipo.sifilisSEMasculino++;
                                pacientes.SSEM.push(paciente);
                                sumaSexo(sumaMasculino, 'sifilisSE');
                            }
                            break;
                        case 'A80': // Poliomielitis
                            if ((edad.unidad === 'años' && edad.valor < 15) || (edad.unidad === 'meses') || (edad.unidad === 'días')) {
                                poliomielitis++;
                                pacientes.polio.push(paciente);
                                if (sexo === 'femenino') {
                                    tipo.poliomielitis++;
                                    sumaSexo(sumaFemenino, 'poliomielitis');

                                } else {
                                    tipo.poliomielitis++;
                                    sumaSexo(sumaMasculino, 'poliomielitis');
                                }
                            }
                            break;
                        default:
                            switch (elem.codigo.reporteC2) {
                                case 'Secreción genital sin especificar':
                                    if (sexo === 'femenino') {
                                        tipo.secrecionSEFemenino++;
                                        pacientes.SECSEF.push(paciente);
                                        sumaSexo(sumaFemenino, 'secrecionSE');
                                    } else {
                                        tipo.secrecionSEMasculino++;
                                        pacientes.SECSEM.push(paciente);
                                        sumaSexo(sumaMasculino, 'secrecionSE');
                                    }
                                    break;
                                case 'Secreción genital purulenta':
                                    if (sexo === 'femenino') {
                                        tipo.secrecionPurulentaFemenino++;
                                        pacientes.SECPF.push(paciente);
                                        sumaSexo(sumaFemenino, 'secrecionPurulenta');
                                    } else {
                                        tipo.secrecionPurulentaMasculino++;
                                        pacientes.SECPM.push(paciente);
                                        sumaSexo(sumaMasculino, 'secrecionPurulenta');
                                    }
                                    break;
                                case 'HIV':
                                    hiv++;
                                    pacientes.hiv.push(paciente);
                                    if (sexo === 'femenino') {
                                        tipo.hiv++;
                                        sumaSexo(sumaFemenino, 'hiv');

                                    } else {
                                        tipo.hiv++;
                                        sumaSexo(sumaMasculino, 'hiv');
                                    }
                                    break;
                                case 'Bronquiolitis':
                                    if ((edad.unidad === 'años' && edad.valor < 2) || (edad.unidad === 'meses') || (edad.unidad === 'días')) {
                                        bronquiolitis++;
                                        pacientes.bronquiolitis.push(paciente);
                                        if (sexo === 'femenino') {
                                            tipo.bronquiolitis++;
                                            sumaSexo(sumaFemenino, 'bronquiolitis');

                                        } else {
                                            tipo.bronquiolitis++;
                                            sumaSexo(sumaMasculino, 'bronquiolitis');
                                        }
                                    }
                                    break;
                                default:
                                    if (elem.codigo.codigo === 'A05.1') { // Botulismo
                                        // if (edad < 1) {
                                        if (edad.unidad === 'meses') {
                                            // sumaMenor1.botulismo++;
                                            if ((edad.unidad === 'meses' && edad.valor <= 6) || edad.unidad === 'días') {
                                                sumaMenor6m.botulismo++;
                                            }
                                            if ((edad.unidad === 'meses' && edad.valor >= 7)) {
                                                suma711m.botulismo++;
                                            }
                                            pacientes.botulismo.push(paciente);
                                            if (sexo === 'femenino') {
                                                sumaSexo(sumaFemenino, 'botulismo');
                                            } else {
                                                sumaSexo(sumaMasculino, 'botulismo');
                                            }
                                        } else {
                                            pacientes.default.push(paciente);
                                            tipo.default++;
                                        }
                                    } else {
                                        if (elem.codigo.codigo === 'A17.0') {  // Meningitis Tuberculosa
                                            if ((edad.unidad === 'años' && edad.valor < 5) || (edad.unidad === 'meses') || (edad.unidad === 'días')) { // Paciente menor a 5 años
                                                sumaMeningitis++;
                                                pacientes.meningitis.push(paciente);
                                                tipo.meningitis++;
                                                if (sexo === 'femenino') {
                                                    sumaSexo(sumaFemenino, 'meningitis');

                                                } else {
                                                    sumaSexo(sumaMasculino, 'meningitis');
                                                }
                                            } else {
                                                pacientes.default.push(paciente);
                                                tipo.default++;
                                            }
                                        } else {
                                            pacientes.default.push(paciente);
                                            tipo.default++;
                                        }
                                    }
                                    break;
                            }
                            break;
                    }

                }

                function calcularContadores(paciente) {
                    const edad = calculoEdad(paciente.fechaNacimiento);
                    // let edad = getAge(paciente.fechaNacimiento);
                    const sexo = paciente.sexo;
                    if ((edad.unidad === 'años' && edad.valor < 5) || (edad.unidad === 'meses') || (edad.unidad === 'días')) {
                        if (edad.unidad === 'meses' || (edad.unidad === 'días')) {
                            // actualizarContador(paciente, sumaMenor1);
                            if ((edad.unidad === 'meses' && edad.valor <= 6) || edad.unidad === 'días') {
                                actualizarContador(paciente, sumaMenor6m);
                            }
                            if (edad.unidad === 'meses' && edad.valor >= 7) {
                                actualizarContador(paciente, suma711m);
                            }
                        }
                        if (edad.unidad === 'años' && edad.valor === 1) {
                            actualizarContador(paciente, suma1);
                        }
                        if (edad.unidad === 'años' && edad.valor >= 2 && edad.valor <= 4) {
                            actualizarContador(paciente, suma24);
                        }
                    }
                    if (edad.unidad === 'años' && edad.valor >= 5 && edad.valor <= 9) {
                        actualizarContador(paciente, suma59);
                    }
                    if (edad.unidad === 'años' && edad.valor >= 10 && edad.valor <= 14) {
                        actualizarContador(paciente, suma1014);
                    }
                    if (edad.unidad === 'años' && edad.valor >= 15 && edad.valor <= 19) {
                        actualizarContador(paciente, suma1519);
                    }
                    if (edad.unidad === 'años' && edad.valor >= 20 && edad.valor <= 24) {
                        actualizarContador(paciente, suma2024);
                    }
                    if (edad.unidad === 'años' && edad.valor >= 25 && edad.valor <= 34) {
                        actualizarContador(paciente, suma2534);
                    }
                    if (edad.unidad === 'años' && edad.valor >= 35 && edad.valor <= 44) {
                        actualizarContador(paciente, suma3544);
                    }
                    if (edad.unidad === 'años' && edad.valor >= 45 && edad.valor <= 64) {
                        actualizarContador(paciente, suma4564);
                    }
                    if (edad.unidad === 'años' && edad.valor >= 65 && edad.valor <= 74) {
                        actualizarContador(paciente, suma6574);
                    }
                    if (edad.unidad === 'años' && edad.valor > 75) {
                        actualizarContador(paciente, sumaMayor75);
                    }

                    const codigoExcepcion = (elem.codigo.codigo === 'A05.1' && edad.unidad === 'meses') || (elem.codigo.codigo === 'A17.0' && ((edad.unidad === 'años' && edad.valor < 5) || (edad.unidad === 'meses') || (edad.unidad === 'días')));

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
                elem.paciente.forEach(elem2 => {
                    calcularContadores(elem2);
                });

                const sumaTotal = sumaMenor6m.default + suma711m.default + suma1.default + suma24.default + suma59.default + suma1014.default + suma1519.default + suma2024.default + suma2534.default
                    + suma3544.default + suma4564.default + suma6574.default + sumaMayor75.default;
                const r2 = {
                    codigo: elem.codigo.codigo,
                    nombre: elem._id,
                    reporteC2: elem.codigo.reporteC2,
                    ficha: elem.codigo.ficha,
                    causa: elem.codigo.causa,
                    sumaMenor6m: sumaMenor6m.default,
                    suma711m: suma711m.default,
                    suma1: suma1.default,
                    suma24: suma24.default,
                    suma59: suma59.default,
                    suma1014: suma1014.default,
                    suma1519: suma1519.default,
                    suma2024: suma2024.default,
                    suma2534: suma2534.default,
                    suma3544: suma3544.default,
                    suma4564: suma4564.default,
                    suma6574: suma6574.default,
                    sumaMayor75: sumaMayor75.default,
                    sumaMasculino: sumaMasculino.default,
                    sumaFemenino: sumaFemenino.default,
                    sumaOtro: sumaOtro.default,
                    total: sumaTotal,
                    pacientes: pacientes.default
                };
                // Se asigna de esta manera para que sea otro objeto y no un puntero al mismo objeto
                const r1 = { ...r2 };
                switch (elem.codigo.codigo) {
                    case 'A05.1':
                        const sumaR = suma1.default + suma24.default + suma59.default + suma1014.default + suma1519.default + suma2024.default + suma2534.default + suma3544.default
                            + suma4564.default + suma6574.default + sumaMayor75.default;
                        if (sumaMenor6m.botulismo > 0 || suma711m.botulismo > 0) { // Botulismo en lactantes (< 1 año)
                            r1.reporteC2 = 'Botulismo del Lactante';
                            r1.sumaMenor6m = sumaMenor6m.botulismo;
                            r1.suma711m = suma711m.botulismo;
                            r1.suma1 = 0;
                            r1.suma24 = 0;
                            r1.suma59 = 0;
                            r1.suma1014 = 0;
                            r1.suma1519 = 0;
                            r1.suma2024 = 0;
                            r1.suma2534 = 0;
                            r1.suma3544 = 0;
                            r1.suma4564 = 0;
                            r1.suma6574 = 0;
                            r1.sumaMayor75 = 0;
                            r1.sumaMasculino = sumaMasculino.botulismo;
                            r1.sumaFemenino = sumaFemenino.botulismo;
                            r1.sumaOtro = otroLactante;
                            r1.total = sumaMenor6m.botulismo + suma711m.botulismo;
                            r1.pacientes = pacientes.botulismo;
                            resultados.push(r1);
                        }
                        if (sumaR > 0) { // Botulismo en no lactantes (>= 1 año)
                            resultados.push(r2);
                        }
                        break;
                    case 'A17.0':
                        const sumaResto = suma59.default + suma1014.default + suma1519.default + suma2024.default + suma2534.default + suma3544.default + suma4564.default + suma6574.default + sumaMayor75.default;
                        if (sumaMeningitis > 0) { // Meningitis Tuberculosa en menores de 5 años
                            r1.reporteC2 = 'Meningitis tuberculosa en menores de 5 años';
                            r1.sumaMenor6m = sumaMenor6m.meningitis;
                            r1.suma711m = suma711m.meningitis;
                            r1.suma1 = suma1.meningitis;
                            r1.suma24 = suma24.meningitis;
                            r1.suma59 = 0;
                            r1.suma1014 = 0;
                            r1.suma1519 = 0;
                            r1.suma2024 = 0;
                            r1.suma2534 = 0;
                            r1.suma3544 = 0;
                            r1.suma4564 = 0;
                            r1.suma6574 = 0;
                            r1.sumaMayor75 = 0;
                            r1.sumaMasculino = sumaMasculino.meningitis;
                            r1.sumaFemenino = sumaFemenino.meningitis;
                            r1.sumaOtro = otroMeningitis;
                            r1.total = sumaMeningitis;
                            r1.pacientes = pacientes.meningitis;
                            resultados.push(r1);
                        }
                        if (sumaResto > 0) {
                            // Se asigna de esta manera para que sea otro objeto y no un puntero al mismo objeto
                            const r3 = { ...r2 };
                            r2.reporteC2 = 'Tuberculosis';
                            resultados.push(r2);
                            r3.reporteC2 = 'Meningitis bacteriana sin especificar agente';
                            resultados.push(r3);
                        }
                        break;
                    default:
                        switch (elem.codigo.causa) {
                            case 'A80':
                                r2.sumaMenor6m = sumaMenor6m.poliomielitis;
                                r2.suma711m = suma711m.poliomielitis;
                                r2.suma1 = suma1.poliomielitis;
                                r2.suma24 = suma24.poliomielitis;
                                r2.suma59 = suma59.poliomielitis;
                                r2.suma1014 = suma1014.poliomielitis;
                                r2.suma1519 = suma1519.poliomielitis;
                                r2.suma2024 = suma2024.poliomielitis;
                                r2.suma2534 = suma2534.poliomielitis;
                                r2.suma3544 = suma3544.poliomielitis;
                                r2.suma4564 = suma4564.poliomielitis;
                                r2.suma6574 = suma6574.poliomielitis;
                                r2.sumaMayor75 = sumaMayor75.poliomielitis;
                                r2.sumaFemenino = sumaFemenino.poliomielitis;
                                r2.sumaMasculino = sumaMasculino.poliomielitis;
                                r2.total = poliomielitis;
                                r2.pacientes = pacientes.polio;
                                resultados.push(r2);
                                break;
                            case 'A51':
                                if (sumaFemenino.sifilisTemprana > 0) {
                                    r2.reporteC2 = 'Sífilis temprana en mujeres';
                                    r2.sumaMenor6m = sumaMenor6m.sifilisTempranaFemenino;
                                    r2.suma711m = suma711m.sifilisTempranaFemenino;
                                    r2.suma1 = suma1.sifilisTempranaFemenino;
                                    r2.suma24 = suma24.sifilisTempranaFemenino;
                                    r2.suma59 = suma59.sifilisTempranaFemenino;
                                    r2.suma1014 = suma1014.sifilisTempranaFemenino;
                                    r2.suma1519 = suma1519.sifilisTempranaFemenino;
                                    r2.suma2024 = suma2024.sifilisTempranaFemenino;
                                    r2.suma2534 = suma2534.sifilisTempranaFemenino;
                                    r2.suma3544 = suma3544.sifilisTempranaFemenino;
                                    r2.suma4564 = suma4564.sifilisTempranaFemenino;
                                    r2.suma6574 = suma6574.sifilisTempranaFemenino;
                                    r2.sumaMayor75 = sumaMayor75.sifilisTempranaFemenino;
                                    r2.sumaFemenino = sumaFemenino.sifilisTemprana;
                                    r2.sumaMasculino = 0;
                                    r2.total = sumaFemenino.sifilisTemprana;
                                    r2.pacientes = pacientes.STF;
                                    resultados.push(r2);
                                }
                                if (sumaMasculino.sifilisTemprana > 0) {
                                    r1.reporteC2 = 'Sífilis temprana en hombres';
                                    r1.sumaMenor6m = sumaMenor6m.sifilisTempranaMasculino;
                                    r1.suma711m = suma711m.sifilisTempranaMasculino;
                                    r1.suma1 = suma1.sifilisTempranaMasculino;
                                    r1.suma24 = suma24.sifilisTempranaMasculino;
                                    r1.suma59 = suma59.sifilisTempranaMasculino;
                                    r1.suma1014 = suma1014.sifilisTempranaMasculino;
                                    r1.suma1519 = suma1519.sifilisTempranaMasculino;
                                    r1.suma2024 = suma2024.sifilisTempranaMasculino;
                                    r1.suma2534 = suma2534.sifilisTempranaMasculino;
                                    r1.suma3544 = suma3544.sifilisTempranaMasculino;
                                    r1.suma4564 = suma4564.sifilisTempranaMasculino;
                                    r1.suma6574 = suma6574.sifilisTempranaMasculino;
                                    r1.sumaMayor75 = sumaMayor75.sifilisTempranaMasculino;
                                    r1.sumaFemenino = 0;
                                    r1.sumaMasculino = sumaMasculino.sifilisTemprana;
                                    r1.total = sumaMasculino.sifilisTemprana;
                                    r1.pacientes = pacientes.STM;
                                    resultados.push(r1);
                                }
                                break;
                            case 'A52' || 'A53':
                                if (sumaFemenino.sifilisSinEspecificar > 0) {
                                    r2.reporteC2 = 'Sífilis sin especificar en mujeres';
                                    r2.sumaMenor6m = sumaMenor6m.sifilisSEFemenino;
                                    r2.suma711m = suma711m.sifilisSEFemenino;
                                    r2.suma1 = suma1.sifilisSEFemenino;
                                    r2.suma24 = suma24.sifilisSEFemenino;
                                    r2.suma59 = suma59.sifilisSEFemenino;
                                    r2.suma1014 = suma1014.sifilisSEFemenino;
                                    r2.suma1519 = suma1519.sifilisSEFemenino;
                                    r2.suma2024 = suma2024.sifilisSEFemenino;
                                    r2.suma2534 = suma2534.sifilisSEFemenino;
                                    r2.suma3544 = suma3544.sifilisSEFemenino;
                                    r2.suma4564 = suma4564.sifilisSEFemenino;
                                    r2.suma6574 = suma6574.sifilisSEFemenino;
                                    r2.sumaMayor75 = sumaMayor75.sifilisSEFemenino;
                                    r2.sumaFemenino = sumaFemenino.sifilisSinEspecificar;
                                    r2.sumaMasculino = 0;
                                    r2.total = sumaFemenino.sifilisSinEspecificar;
                                    r2.pacientes = pacientes.SSEF;
                                    resultados.push(r2);
                                }
                                if (sumaMasculino.sifilisSinEspecificar > 0) {
                                    r1.reporteC2 = 'Sífilis sin especificar en hombres';
                                    r1.sumaMenor6m = sumaMenor6m.sifilisSEMasculino;
                                    r1.suma711m = suma711m.sifilisSEMasculino;
                                    r1.suma1 = suma1.sifilisSEMasculino;
                                    r1.suma24 = suma24.sifilisSEMasculino;
                                    r1.suma59 = suma59.sifilisSEMasculino;
                                    r1.suma1014 = suma1014.sifilisSEMasculino;
                                    r1.suma1519 = suma1519.sifilisSEMasculino;
                                    r1.suma2024 = suma2024.sifilisSEMasculino;
                                    r1.suma2534 = suma2534.sifilisSEMasculino;
                                    r1.suma3544 = suma3544.sifilisSEMasculino;
                                    r1.suma4564 = suma4564.sifilisSEMasculino;
                                    r1.suma6574 = suma6574.sifilisSEMasculino;
                                    r1.sumaMayor75 = sumaMayor75.sifilisSEMasculino;
                                    r1.sumaFemenino = 0;
                                    r1.sumaMasculino = sumaMasculino.sifilisSinEspecificar;
                                    r1.total = sumaMasculino.sifilisSinEspecificar;
                                    r1.pacientes = pacientes.SSEM;
                                    resultados.push(r1);
                                }
                                break;
                            default:
                                switch (elem.codigo.reporteC2) {
                                    case 'Secreción genital purulenta':
                                        if (sumaFemenino.secrecionPurulenta > 0) {
                                            r2.reporteC2 = 'Secreción genital sin especificar en mujeres';
                                            r2.sumaMenor6m = sumaMenor6m.secrecionPurulentaFemenino;
                                            r2.suma711m = suma711m.secrecionPurulentaFemenino;
                                            r2.suma1 = suma1.secrecionPurulentaFemenino;
                                            r2.suma24 = suma24.secrecionPurulentaFemenino;
                                            r2.suma59 = suma59.secrecionPurulentaFemenino;
                                            r2.suma1014 = suma1014.secrecionPurulentaFemenino;
                                            r2.suma1519 = suma1519.secrecionPurulentaFemenino;
                                            r2.suma2024 = suma2024.secrecionPurulentaFemenino;
                                            r2.suma2534 = suma2534.secrecionPurulentaFemenino;
                                            r2.suma3544 = suma3544.secrecionPurulentaFemenino;
                                            r2.suma4564 = suma4564.secrecionPurulentaFemenino;
                                            r2.suma6574 = suma6574.secrecionPurulentaFemenino;
                                            r2.sumaMayor75 = sumaMayor75.secrecionPurulentaFemenino;
                                            r2.sumaFemenino = sumaFemenino.secrecionPurulenta;
                                            r2.sumaMasculino = 0;
                                            r2.total = sumaFemenino.secrecionPurulenta;
                                            r2.pacientes = pacientes.SECPF;
                                            resultados.push(r2);
                                        }
                                        if (sumaMasculino.secrecionPurulenta > 0) {
                                            r1.reporteC2 = 'Secreción genital purulenta en hombres';
                                            r1.sumaMenor6m = sumaMenor6m.secrecionPurulentaMasculino;
                                            r1.suma711m = suma711m.secrecionPurulentaMasculino;
                                            r1.suma1 = suma1.secrecionPurulentaMasculino;
                                            r1.suma24 = suma24.secrecionPurulentaMasculino;
                                            r1.suma59 = suma59.secrecionPurulentaMasculino;
                                            r1.suma1014 = suma1014.secrecionPurulentaMasculino;
                                            r1.suma1519 = suma1519.secrecionPurulentaMasculino;
                                            r1.suma2024 = suma2024.secrecionPurulentaMasculino;
                                            r1.suma2534 = suma2534.secrecionPurulentaMasculino;
                                            r1.suma3544 = suma3544.secrecionPurulentaMasculino;
                                            r1.suma4564 = suma4564.secrecionPurulentaMasculino;
                                            r1.suma6574 = suma6574.secrecionPurulentaMasculino;
                                            r1.sumaMayor75 = sumaMayor75.secrecionPurulentaMasculino;
                                            r1.sumaFemenino = 0;
                                            r1.sumaMasculino = sumaMasculino.secrecionPurulenta;
                                            r1.total = sumaMasculino.secrecionPurulenta;
                                            r1.pacientes = pacientes.SECPM;
                                            resultados.push(r1);
                                        }
                                        break;
                                    case 'Secreción genital sin especificar':
                                        if (sumaFemenino.secrecionSE > 0) {
                                            r2.reporteC2 = 'Secreción genital sin especificar en mujeres';
                                            r2.sumaMenor6m = sumaMenor6m.secrecionSEFemenino;
                                            r2.suma711m = suma711m.secrecionSEFemenino;
                                            r2.suma1 = suma1.secrecionSEFemenino;
                                            r2.suma24 = suma24.secrecionSEFemenino;
                                            r2.suma59 = suma59.secrecionSEFemenino;
                                            r2.suma1014 = suma1014.secrecionSEFemenino;
                                            r2.suma1519 = suma1519.secrecionSEFemenino;
                                            r2.suma2024 = suma2024.secrecionSEFemenino;
                                            r2.suma2534 = suma2534.secrecionSEFemenino;
                                            r2.suma3544 = suma3544.secrecionSEFemenino;
                                            r2.suma4564 = suma4564.secrecionSEFemenino;
                                            r2.suma6574 = suma6574.secrecionSEFemenino;
                                            r2.sumaMayor75 = sumaMayor75.secrecionSEFemenino;
                                            r2.sumaFemenino = sumaFemenino.secrecionSE;
                                            r2.sumaMasculino = 0;
                                            r2.total = sumaFemenino.secrecionSE;
                                            r2.pacientes = pacientes.SECSEF;
                                            resultados.push(r2);
                                        }
                                        if (sumaMasculino.secrecionSE > 0) {
                                            r1.reporteC2 = 'Secreción genital sin especificar en hombres';
                                            r1.sumaMenor6m = sumaMenor6m.secrecionSEMasculino;
                                            r1.suma711m = suma711m.secrecionSEMasculino;
                                            r1.suma1 = suma1.secrecionSEMasculino;
                                            r1.suma24 = suma24.secrecionSEMasculino;
                                            r1.suma59 = suma59.secrecionSEMasculino;
                                            r1.suma1014 = suma1014.secrecionSEMasculino;
                                            r1.suma1519 = suma1519.secrecionSEMasculino;
                                            r1.suma2024 = suma2024.secrecionSEMasculino;
                                            r1.suma2534 = suma2534.secrecionSEMasculino;
                                            r1.suma3544 = suma3544.secrecionSEMasculino;
                                            r1.suma4564 = suma4564.secrecionSEMasculino;
                                            r1.suma6574 = suma6574.secrecionSEMasculino;
                                            r1.sumaMayor75 = sumaMayor75.secrecionSEMasculino;
                                            r1.sumaFemenino = 0;
                                            r1.sumaMasculino = sumaMasculino.secrecionSE;
                                            r1.total = sumaMasculino.secrecionSE;
                                            r1.pacientes = pacientes.SECSEM;
                                            resultados.push(r1);
                                        }
                                        break;
                                    case 'HIV':
                                        r2.sumaMenor6m = sumaMenor6m.hiv;
                                        r2.suma711m = suma711m.hiv;
                                        r2.suma1 = suma1.hiv;
                                        r2.suma24 = suma24.hiv;
                                        r2.suma59 = suma59.hiv;
                                        r2.suma1014 = suma1014.hiv;
                                        r2.suma1519 = suma1519.hiv;
                                        r2.suma2024 = suma2024.hiv;
                                        r2.suma2534 = suma2534.hiv;
                                        r2.suma3544 = suma3544.hiv;
                                        r2.suma4564 = suma4564.hiv;
                                        r2.suma6574 = suma6574.hiv;
                                        r2.sumaMayor75 = sumaMayor75.hiv;
                                        r2.sumaMasculino = sumaMasculino.hiv;
                                        r2.sumaFemenino = sumaFemenino.hiv;
                                        r2.total = hiv;
                                        r2.pacientes = pacientes.hiv;
                                        resultados.push(r2);
                                        break;
                                    case 'Bronquiolitis':
                                        r2.sumaMenor6m = sumaMenor6m.bronquiolitis;
                                        r2.suma711m = suma711m.bronquiolitis;
                                        r2.suma1 = suma1.bronquiolitis;
                                        r2.suma24 = suma24.bronquiolitis;
                                        r2.suma59 = suma59.bronquiolitis;
                                        r2.suma1014 = suma1014.bronquiolitis;
                                        r2.suma1519 = suma1519.bronquiolitis;
                                        r2.suma2024 = suma2024.bronquiolitis;
                                        r2.suma2534 = suma2534.bronquiolitis;
                                        r2.suma3544 = suma3544.bronquiolitis;
                                        r2.suma4564 = suma4564.bronquiolitis;
                                        r2.suma6574 = suma6574.bronquiolitis;
                                        r2.sumaMayor75 = sumaMayor75.bronquiolitis;
                                        r2.sumaMasculino = sumaMasculino.bronquiolitis;
                                        r2.sumaFemenino = sumaFemenino.bronquiolitis;
                                        r2.total = bronquiolitis;
                                        r2.pacientes = pacientes.bronquiolitis;
                                        resultados.push(r2);
                                        break;
                                    default:
                                        if (sumaTotal > 0) {
                                            resultados.push(r2);
                                        }
                                        break;
                                }
                                break;
                        }
                        break;
                }
            }
        });

        Promise.all(promises).then(() => {

            const sortResultados = (a, b) => {
                if (a.codigo < b.codigo) {
                    return -1;
                }
                if (a.codigo > b.codigo) {
                    return 1;
                }
                return 0;
            };
            // Se agrupan los códigos correspondientes a Sífilis temprana (causa A51) en sexos
            const sifilisTempranaFemenino = resultados.filter(resultado => {
                return (resultado.causa === 'A51' && resultado.sumaFemenino > 0);
            });
            if (sifilisTempranaFemenino.length > 0) {
                const STF = sumarCodigos(sifilisTempranaFemenino);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.causa === 'A51' && resultado.sumaFemenino > 0));
                });
                resultados.push(STF);
            }
            const sifilisTempranaMasculino = resultados.filter(resultado => {
                return (resultado.causa === 'A51' && resultado.sumaMasculino > 0);
            });
            if (sifilisTempranaMasculino.length > 0) {
                const STM = sumarCodigos(sifilisTempranaMasculino);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.causa === 'A51' && resultado.sumaMasculino > 0));
                });
                resultados.push(STM);
            }

            // Se agrupan los códigos correspondientes a sífilis sin especificar (causa A52 y A53) en sexos
            const sifilisSEFemenino = resultados.filter(resultado => {
                return ((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaFemenino > 0);
            });
            if (sifilisSEFemenino.length > 0) {
                const SSEF = sumarCodigos(sifilisSEFemenino);
                resultados = resultados.filter(resultado => {
                    return (!((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaFemenino > 0));
                });
                resultados.push(SSEF);
            }
            const sifilisSEMasculino = resultados.filter(resultado => {
                return ((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaMasculino > 0);
            });
            if (sifilisSEMasculino.length > 0) {
                const SSEM = sumarCodigos(sifilisSEMasculino);
                resultados = resultados.filter(resultado => {
                    return (!((resultado.causa === 'A52' || resultado.causa === 'A53') && resultado.sumaMasculino > 0));
                });
                resultados.push(SSEM);
            }
            // Se agrupan los códigos correspondientes a Secreción Genital Purulenta (codigos A54.0, A54.2 y A54.6) en sexos
            const secrecionPFemenino = resultados.filter(resultado => {
                return ((resultado.reporteC2 === 'Secreción genital purulenta en mujeres'));
            });
            if (secrecionPFemenino.length > 0) {
                const SPF = sumarCodigos(secrecionPFemenino);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.reporteC2 === 'Secreción genital purulenta en mujeres' && resultado.sumaFemenino > 0));
                });
                resultados.push(SPF);
            }
            const secrecionPMasculino = resultados.filter(resultado => {
                return ((resultado.reporteC2 === 'Secreción genital purulenta en hombres') && resultado.sumaMasculino > 0);
            });
            if (secrecionPMasculino.length > 0) {
                const SPM = sumarCodigos(secrecionPMasculino);
                resultados = resultados.filter(resultado => {
                    return (!((resultado.reporteC2 === 'Secreción genital purulenta en hombres') && resultado.sumaMasculino > 0));
                });
                resultados.push(SPM);
            }

            // Se agrupan los códigos correspondientes a Secreción Genital sin especificar  en sexos
            const secrecionSEFemenino = resultados.filter(resultado => {
                return ((resultado.reporteC2 === 'Secreción genital sin especificar en mujeres'));
            });
            if (secrecionSEFemenino.length > 0) {
                const SSEF = sumarCodigos(secrecionSEFemenino);
                resultados = resultados.filter(resultado => {
                    return (!((resultado.reporteC2 === 'Secreción genital sin especificar en mujeres') && resultado.sumaFemenino > 0));
                });
                resultados.push(SSEF);
            }
            const secrecionSEMasculino = resultados.filter(resultado => {
                return ((resultado.reporteC2 === 'Secreción genital sin especificar en hombres') && resultado.sumaMasculino > 0);
            });
            if (secrecionSEMasculino.length > 0) {
                const SSEM = sumarCodigos(secrecionSEMasculino);
                resultados = resultados.filter(resultado => {
                    return (!((resultado.reporteC2 === 'Secreción genital sin especificar en hombres') && resultado.sumaMasculino > 0));
                });
                resultados.push(SSEM);
            }

            // Se agrupan los códigos correspondientes a poliomielitis
            const poliomielitis = resultados.filter(resultado => {
                return (resultado.causa === 'A80');
            });
            if (poliomielitis.length > 0) {
                const P = sumarCodigos(poliomielitis);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.causa === 'A80'));
                });
                resultados.push(P);
            }

            // Se agrupan los códigos correspondientes a hiv
            const hiv = resultados.filter(resultado => {
                return (resultado.reporteC2 === 'HIV');
            });
            if (hiv.length > 0) {
                const HIV = sumarCodigos(hiv);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.reporteC2 === 'HIV'));
                });
                resultados.push(HIV);
            }

            // Se agrupan los códigos correspondientes a bronquiolitis
            const bronquiolitis = resultados.filter(resultado => {
                return (resultado.reporteC2 === 'Bronquiolitis');
            });
            if (bronquiolitis.length > 0) {
                const BR = sumarCodigos(bronquiolitis);
                resultados = resultados.filter(resultado => {
                    return (!(resultado.reporteC2 === 'Bronquiolitis'));
                });
                resultados.push(BR);
            }
            resultados.sort(sortResultados);
            resolve(resultados);
        });
    });
}
