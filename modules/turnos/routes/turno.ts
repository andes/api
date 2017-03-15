import * as express from 'express';
import * as agenda from '../schemas/agenda';
import * as utils from '../../../utils/utils';

let router = express.Router();
// next como tercer parametro
router.put('/turno/:id', function (req, res, next) {
  let changes = req.body;
  let etiquetaEstado: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".estado";
  let etiquetaPaciente: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".paciente";
  let etiquetaPrestacion: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".tipoPrestacion";

  let query = {
    _id: req.params.id
  };

  query[etiquetaEstado] = "disponible"; //agrega un tag al json query

  let update: any = {};
  update[etiquetaEstado] = req.body.estado;
  update[etiquetaPrestacion] = req.body.tipoPrestacion;
  update[etiquetaPaciente] = req.body.paciente;

  // console.log("Update   ", update);

  agenda.findOneAndUpdate(query, { $set: update }, function (err, agen) {
    if (err) {
      return next(err);
    }
    res.json(agen);
  });
});

router.patch('/turno/:id', function (req, res, next) {
  agenda.findById(req.params.id, function (err, data) {
    if (err) {
      return next(err);
    }
    let posBloque: number;
    let posTurno: number;
    // console.log((data as any).bloques.length)
    // console.log('ID BLOQUE: ' + req.body.idBloque)
    // console.log('ID TURNO: ' + req.body.idTurno)
    // console.log('POSBLOQUE: ' + (data as any).bloques.indexOf((data as any).bloques[0]))
    for (let x = 0; x < (data as any).bloques.length; x++) {
      if ((data as any).bloques[x]._id.equals(req.body.idBloque)) {
        posBloque = x;
        console.log('POSBLOQUE: ' + posBloque);
      }
    }

    for (let y = 0; y < (data as any).bloques[posBloque].turnos.length; y++) {
      // console.log((data as any).bloques[posBloque].turnos[y]._id)
      // console.log(req.body.idTurno)
      if ((data as any).bloques[posBloque].turnos[y]._id.equals(req.body.idTurno)) {
        posTurno = y;
        console.log('POSTURNO: ' + posTurno);
      }
    }

    let etiquetaEstado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estado';
    let etiquetaPaciente: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.paciente';
    let etiquetaPrestacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoPrestacion';
    let update: any = {};
    update[etiquetaEstado] = req.body.estado;
    update[etiquetaPrestacion] = req.body.tipoPrestacion;
    update[etiquetaPaciente] = req.body.paciente;

    // agenda.findByIdAndUpdate(req.params.idAgenda, function (err2, data2) {
    //   if (err2) {
    //     return next(err2);
    //   }
    // });
    res.json(data);
  });


});

export = router;
