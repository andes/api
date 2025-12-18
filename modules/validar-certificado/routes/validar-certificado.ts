import * as express from 'express';
import * as moment from 'moment';
import { Prestacion } from '../../rup/schemas/prestacion';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { IPacienteDoc } from '../../../core-v2/mpi/paciente/paciente.interface';

const router = express.Router();


router.get('/', async (req, res, next) => {
    const { fechaValidacion, documento, sexo } = req.query as any;
    const paciente: IPacienteDoc = await Paciente.findOne({ documento, sexo });
    const pacienteId = paciente?.id;
    if (!pacienteId) {
        return next('paciente_invalido');
    }
    const fechaCondicion = {
        $gte: moment(fechaValidacion).startOf('day').toDate(),
        $lte: moment(fechaValidacion).endOf('day').toDate()
    };
    const match = {
        'estadoActual.createdAt': fechaCondicion,
        'paciente.id': pacienteId,
        'estadoActual.tipo': 'validada'
    };
    const prestaciones = await Prestacion.find(match);
    if (prestaciones.length) {
        const conceptosCertificado = [
            '791000246108',
            '801000246109',
            '772786005',
            '781000246105',
            '2171000246104'
        ];
        let registroCertificado: boolean;
        prestaciones.forEach(prestacion => {
            const prestacionAux: any = new Prestacion(prestacion);
            const registros = prestacionAux.getRegistros(true);
            registroCertificado = registros.some(registro => conceptosCertificado.includes(registro.concepto.conceptId));
        });
        return registroCertificado ? res.json(true) : next('registro_invalido');
    } else {
        return next('registro_invalido');
    }

});

export = router;
