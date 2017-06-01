import * as express from 'express';
import { snomed } from '../schemas/snomed';
let router = express.Router();

router.get('/snomed', function (req, res, next) {

    let query;

    query = snomed.find();

        // if (req.query.vigencia) {
        //     query = problema.find({
        //         $where: "this.evoluciones[this.evoluciones.length - 1].vigencia != '" + req.query.vigencia + "'"
        //     });
        // } else {
        //     // filtro por defecto para que no muestre los problemas transformados
        //     query = problema.find({
        //         $where: "this.evoluciones[this.evoluciones.length - 1].vigencia != 'transformado'"
        //     });
        // }

        // if (req.query.idPaciente) {
        //     query.where('paciente').equals(req.query.idPaciente);
        // }

        // if (req.query.idTipoProblema) {
        //     query.where('tipoProblema').equals(req.query.idTipoProblema);
        // }
    

    query.sort({ 'fechaInicio': -1 });

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });


});

export = router;
