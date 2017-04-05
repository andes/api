import * as express from 'express';
import * as agenda from '../schemas/agenda';
import { Logger } from '../../../utils/logService';
import { ValidateDarTurno } from '../../../utils/validateDarTurno';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';

let router = express.Router();

// next como tercer parametro
router.put('/turno/:id', function (req, res, next) {
  let changes = req.body;
  let etiquetaEstado: string = 'bloques.' + req.body.indiceBloque + '.turnos.' + req.body.indiceTurno + '.estado';
  let etiquetaPaciente: string = 'bloques.' + req.body.indiceBloque + '.turnos.' + req.body.indiceTurno + '.paciente';
  let etiquetaPrestacion: string = 'bloques.' + req.body.indiceBloque + '.turnos.' + req.body.indiceTurno + '.tipoPrestacion';

  let query = {
    _id: req.params.id
  };

  query[etiquetaEstado] = 'disponible'; // agrega un tag al json query

  let update: any = {};
  update[etiquetaEstado] = 'asignado';
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


router.patch('/agenda/:idAgenda/bloque/:idBloque/turno/:idTurno', function (req, res, next) {
  // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion

  let continues = ValidateDarTurno.checkTurno(req.body);
  if (continues.valid) {

    // se verifica la existencia del paciente 

    paciente.findById(req.body.paciente.id, function verificarPaciente(err, cant) {
      if (err) {
        console.log('PACIENTE INEXISTENTE', err);
        return next(err);
      } else {

        // se verifica la existencia del tipoPrestacion

        tipoPrestacion.findById(req.body.tipoPrestacion._id, function verificarTipoPrestacion(err, data) {
          if (err) {
            console.log('TIPO PRESTACION INEXISTENTE', err);
            return next(err);
          } else {
            console.log(cant);

            // se obtiene la agenda que se va a modificar

            agenda.findById(req.params.idAgenda, function getAgenda(err, data) {
              if (err) {
                return next(err);
              }
              let posBloque: number;
              let posTurno: number;

              // Los siguientes 2 for ubican el indice del bloque y del turno

              for (let x = 0; x < (data as any).bloques.length; x++) {
                if ((data as any).bloques[x]._id.equals(req.params.idBloque)) {
                  posBloque = x;
                  for (let y = 0; y < (data as any).bloques[posBloque].turnos.length; y++) {
                    if ((data as any).bloques[posBloque].turnos[y]._id.equals(req.params.idTurno)) {
                      posTurno = y;
                      console.log('POSTURNO: ' + posTurno);
                    }
                  }
                  console.log('POSBLOQUE: ' + posBloque);
                }
              }

              let etiquetaTipoTurno: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoTurno';
              let etiquetaEstado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estado';
              let etiquetaPaciente: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.paciente';
              let etiquetaPrestacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoPrestacion';
              let update: any = {};
              update[etiquetaEstado] = 'asignado';
              update[etiquetaPrestacion] = req.body.tipoPrestacion;
              update[etiquetaPaciente] = req.body.paciente;
              update[etiquetaTipoTurno] = req.body.tipoTurno;

              let query = {
                _id: req.params.idAgenda,
              };
              query[etiquetaEstado] = 'disponible'; // agrega un tag al json query
              console.log('QUERY ' + query);

              // se hace el update con findOneAndUpdate para garantizar la atomicidad de la operacion

              (agenda as any).findOneAndUpdate(query, { $set: update }, { new: true, passRawResult: true },
                function actualizarAgenda(err2, doc2, writeOpResult) {
                  if (err2) {
                    console.log('ERR2: ' + err2);
                    return next(err2);
                  }
                  console.log('WRITE OP RESULT', writeOpResult.value);
                  if (writeOpResult.value === null) {
                    return next('El turno ya fue asignado');
                  } else {
                    let datosOp = {
                      estado: update[etiquetaEstado],
                      paciente: update[etiquetaPaciente],
                      prestacion: update[etiquetaPrestacion],
                      tipoTurno: update[etiquetaTipoTurno]
                    };

                    Logger.log(req, 'turnos', 'update', datosOp);
                  }
                  res.json(data);
                });
            });
          }
        });

      }
    });
  } else {
    console.log('NO VALIDO');
    return next('Los datos del paciente son inválidos');
  }
});

export = router;
