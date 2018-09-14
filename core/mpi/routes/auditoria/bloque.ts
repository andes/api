import * as express from 'express';
import { pacienteMpi } from '../../schemas/paciente';
import { paciente } from '../../schemas/paciente';
import { Auth } from '../../../../auth/auth.class';

const router = express.Router();


/* Obtengo los pacientes que tienen la misma clave de blocking */
router.get('/bloques/pacientes/:idTipoBloque/:idBloque', (req, res, next) => {
    if (!Auth.check(req, 'mpi:bloque:get')) {
        return next(403);
    }
    const redix = 10;
    const idTipoBloque: number = parseInt(req.params.idTipoBloque, redix);
    const filtro = 'claveBlocking.' + idTipoBloque;
    const query = {activo: true};
    let lista = [];

    query[filtro] = {
        $eq: req.params.idBloque,
    };

    Promise.all([
        paciente.find(query),
        pacienteMpi.find(query)
    ]).then((data: any[]) => {
        data.forEach(listaPac => {
            lista = lista.concat(listaPac);
        });
        res.json(lista);
    });
});

// TODO:
// EL SIG. CODIGO NO SE ESTA UTILIZANDO Y HAY QUE REVISARLO
//  COMENTARIZADO HASTA ENTONCES
//
// router.get('/bloques/:idTipoBloque', function (req, res, next) {
//     if (req.params.idTipoBloque) {
//         let filtro = 'claveBlocking.' + req.params.idTipoBloque;
//         paciente.aggregate([{
//             '$group': {
//                 '_id': {
//                     '$arrayElemAt': ['$claveBlocking', Number(req.params.idTipoBloque)]
//                 },
//                 'count': {
//                     '$sum': 1
//                 }
//             }
//         }, {
//             '$match': {
//                 count: {
//                     $gt: 1
//                 }
//             }
//         }], function (err, data) {
//             if (err) {
//                 next(err);
//             };

//             let claves = data.map(elemt => {
//                 let dato = elemt._id;
//                 return dato;
//             }).filter(n => {
//                 return (n !== undefined && n != null && n !== '');
//             });

//             res.json(claves);
//         });
//     }
// });
// router.get('/bloques/pacientesSisa/:idTipoBloque/:idBloque', function (req, res, next) {
//     let filtro = 'claveBlocking.' + req.params.idTipoBloque;
//     let query = {};
//     query[filtro] = {
//         $eq: req.params.idBloque
//     };

//     let listaPac = [];
//     paciente.find(query, function (err, data) {
//         if (err) {
//             next(err);
//         };
//         // let servSisa = new ServicioSisa();
//         let pacientesRes = [];
//         // let weights = config.mpi.weightsDefault;
//         // let listaPac;
//         listaPac = data;
//         listaPac.forEach(function (elem) {
//             // let valorSisa = 0;
//             let auxPac = elem;
//             pacientesRes.push(ServicioSisa.matchSisa(auxPac));
//         });
//         Promise.all(pacientesRes).then(values => {
//             let arrPacValidados;
//             arrPacValidados = values;
//             let arrSalida = [];
//             arrPacValidados.forEach(function (pacVal) {
//                 let datoPac;
//                 datoPac = pacVal;
//                 if (datoPac.matcheos.matcheo >= 99 && datoPac.paciente.estado === 'temporal') {
//                     arrSalida.push(validarSisa.validarPaciente(datoPac, 'Sisa'));
//                 } else {
//                     arrSalida.push(datoPac);
//                 }
//             });

//             Promise.all(arrSalida).then(PacSal => {
//                 res.json(PacSal);
//             }).catch(err2 => {
//                 console.log(err2);
//                 next(err2);
//             });

//         }).catch(err3 => {
//             console.log(err3);
//             next(err3);
//         });
//     });
// });

// router.post('/bloques/pacientes/fusionar', function (req, res, next) {
//     let pacienteOriginal = new paciente(req.body.pacienteOriginal);
//     let pacienteFusionar = new paciente(req.body.pacienteFusionar);
//     let query = { '_id': pacienteFusionar._id };
//     paciente.findOne(query, function (err, data) {
//         if (err) {
//             return next(err);
//         };
//         let pacAux;
//         pacAux = data;
//         console.log('pacAux', pacAux);
//         let arrayIds = pacAux.identificadores;
//         paciente.update({ '_id': pacienteOriginal._id }, { $addToSet: { 'identificadores': { $each: arrayIds } } }, { upsert: true },
//             function (err2) {
//                 if (err2) {
//                     return next(err2);
//                 } else {
//                     paciente.findByIdAndUpdate(pacienteFusionar._id.toString(), { 'activo': false }, { new: true }, function (err3, elem) {
//                         if (err3) {
//                             return next(err3);
//                         }
//                         res.json(elem);
//                     });
//                 }
//             });

//     });
// });

// router.delete('/bloques/pacientes/:id', function (req, res, next) {
//     console.log(req.params.id);
//     paciente.findByIdAndUpdate(req.params.id, { 'activo': false }, { new: true }, function (err, data) {
//         if (err) {
//             return next(err);
//         }
//         res.json(data);
//     });
// });


// router.post('/bloques/pacientes/validar', function (req, res, next) {
//     // console.log("Entra a validar", req.body);
//     let pacienteVal = new paciente(req.body.paciente);
//     let entidad = req.body.entidad;
//     // var servSisa = new ServicioSisa();
//     let datoCompleto = { 'paciente': pacienteVal, 'matcheos': { 'entidad': entidad, 'matcheo': 0, 'datosPaciente': {} } };
//     validarSisa.validarPaciente(datoCompleto, entidad).then(resultado => {
//         res.json(resultado);
//     })
//         .catch(err => {
//             return next(err);
//         });
// });

// router.post('/bloques/pacientes/validarActualizar', function (req, res, next) {
//     // console.log("Entra a validar", req.body);
//     let pacienteVal = new paciente(req.body.paciente);
//     let entidad = req.body.entidad;
//     let datosPacEntidad = req.body.DatoPacEntidad;

//     // var servSisa = new ServicioSisa();
//     // console.log("entidad", entidad);
//     let datoCompleto = { 'paciente': pacienteVal, 'matcheos': { 'entidad': entidad, 'matcheo': 0, 'datosPaciente': datosPacEntidad } };
//     console.log('Dato Completo', datoCompleto);
//     validarSisa.validarActualizarPaciente(datoCompleto, entidad, datosPacEntidad).then(resultado => {
//         res.json(resultado);
//     })
//         .catch(err => {
//             return next(err);
//         });
// });


// /************SYNTIS************** */
// router.get('/bloques/pacientesSintys/:idb/:id', function (req, res, next) {
//     let filtro = 'claveBlocking.' + req.params.idb;
//     let query = {};
//     query[filtro] = {
//         $eq: req.params.id
//     };

//     // let listaPac = [];
//     paciente.find(query, function (err, data) {
//         if (err) {
//             next(err);
//         };
//         // var servSisa = new ServicioSisa();
//         let pacientesRes = [];
//         // let weights = config.mpi.weightsDefault;
//         let listaPac;
//         listaPac = data;
//         listaPac.forEach(function (elem) {
//             // let valorSisa = 0;
//             let auxPac = elem;
//             pacientesRes.push(matchSintys(auxPac));
//         });
//         Promise.all(pacientesRes).then(values => {
//             // console.log("Inicia Promise All");
//             let arrPacValidados;
//             arrPacValidados = values;
//             let arrSalida = [];
//             arrPacValidados.forEach(function (pacVal) {
//                 let datoPac;
//                 datoPac = pacVal;
//                 if (datoPac.matcheos.matcheo >= 99 && datoPac.paciente.estado === 'temporal') {
//                     arrSalida.push(validarSisa.validarPaciente(datoPac, 'Sintys'));
//                 } else {
//                     arrSalida.push(datoPac);
//                 }
//             });

//             Promise.all(arrSalida).then(PacSal => {
//                 // console.log("devuelvo el array", PacSal);
//                 res.json(PacSal);
//             }).catch(err2 => {
//                 // console.log(err);
//                 return next(err2);
//             });

//         }).catch(err1 => {
//             // console.log(err);
//             return next(err1);
//         });

//     });
// });

export = router;
