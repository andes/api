import * as express from 'express';
import * as moment from 'moment';
import { Prestacion } from '../../rup/schemas/prestacion';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { IPacienteDoc } from '../../../core-v2/mpi/paciente/paciente.interface';

const router = express.Router();


router.get('/', async (req, res) => {
    const { fechaValidacion, documento, sexo } = req.query;
    const paciente: IPacienteDoc = await Paciente.findOne({ documento, sexo });
    const pacienteId = paciente?.id;
    if (!pacienteId) {
        return res.send(false);
    }
    const fechaCondicion = {
        $gte: moment(fechaValidacion).startOf('day').toDate(),
        $lte: moment(fechaValidacion).endOf('day').toDate()
    };
    const match = {
        'estadoActual.createdAt': fechaCondicion,
        'paciente.id': pacienteId,
        'paciente.sexo': sexo
    };
    const prestaciones = await Prestacion.find(match);
    if (prestaciones.length) {
        let registroCertificado: boolean;
        prestaciones.forEach(prestacion => {
            const prestacionAux: any = new Prestacion(prestacion);
            const registros = prestacionAux.getRegistros(true);
            registroCertificado = registros.some(registro => registro.concepto.conceptId === '781000246105');
        });
        return res.send(registroCertificado);
    } else {
        return res.send(false);
    }

});

export = router;
