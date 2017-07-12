import * as express from 'express';
import { logPaciente } from '../schemas/logPaciente';

let router = express.Router();

router.get('/logPaciente:id*?', function(req, res, next){
//     if (req.params.idPaciente){

//     }
//    logPaciente.findById()
});

export = router;


