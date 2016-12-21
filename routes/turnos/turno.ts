import * as express from 'express'
import * as agenda from '../../schemas/turnos/agenda'
import * as utils from '../../utils/utils';

var router = express.Router();

//El put se usa para pasar el turno a estado asignado, ver con Juan
router.put('/turno/:_id', function (req, res) {
  let etiquetaEstado: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".estado";
  let etiquetaPaciente: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".paciente";
  console.log(req.body.estado);
  
  let query = {
    _id: req.params._id
  }
  query[etiquetaEstado] = "disponible"; //agrega un tag al json query
  
  let update: any = {};
  update[etiquetaEstado] = req.body.estado;
  update[etiquetaPaciente] = req.body.paciente;

  agenda.findOneAndUpdate(query, { $set: update }, function (err, agen) {
    if (err)
      res.send(err);

    res.json(agen);
  });
});

export = router;