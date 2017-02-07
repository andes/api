import * as express from 'express'
import * as agenda from '../schemas/agenda'
import * as utils from '../../../utils/utils';

var router = express.Router();
// next como tercer parametro
router.put('/turno/:id', function (req, res, next) {
  let changes = req.body;
  let etiquetaEstado: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".estado";
  let etiquetaPaciente: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".paciente";
  let etiquetaPrestacion: string = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".prestacion";

  let query = {
    _id: req.params.id
  }
  query[etiquetaEstado] = "disponible"; //agrega un tag al json query

  let update: any = {};
  update[etiquetaEstado] = req.body.estado;
  update[etiquetaPrestacion] = req.body.prestacion;
  update[etiquetaPaciente] = req.body.paciente;

  agenda.findOneAndUpdate(query, { $set: update }, function (err, agen) {
    if (err) {
      return next(err);
    }
    res.json(agen);
  });
});

export = router;