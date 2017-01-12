import {
    machingDeterministico
} from './../../utils/machingDeterministico';
import {
    IPerson
} from './../../utils/IPerson';
import * as express from 'express'
import * as paciente from '../../schemas/paciente'
import {
    servicioSintys
} from './../../utils/servicioSintys'


var router = express.Router();

router.get('/pacienteSintys/:id', function (req, res, next){
   
        
        var unDocumento = req.params.id;

        var servSintys = new servicioSintys();
        var pacientesRes = [];
        var weights = {
            identity: 0.3,
            name: 0.3,
            gender: 0.1,
            birthDate: 0.3
        }; 
      
        var datos = servSintys.getPacienteSintys(unDocumento);

        Promise.all(pacientesRes).then(values => {
            console.log(values);
            pacientesRes.push(values);
            res.json(values);
        }).catch(err => {
            console.log(err);
            next(err);
        })


});

export = router