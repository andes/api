import * as express from 'express';
import { laboratorioLog } from '../laboratorio.log';
import * as laboratorioController from '../laboratorios.controller';
import { PacienteCtr } from '../../../core-v2/mpi/paciente';
import moment = require('moment');

const router = express.Router();

router.get('/protocolosLab/:id?', async (req, res) => {
    let dataSearch;
    const service = 'get-LABAPI';
    try {
        if (req.params.id) {
            dataSearch = { idProtocolo: req.params.id };
        } else if (req.query.pacienteId) {
            const paciente = await PacienteCtr.findById(req.query.pacienteId);
            if (paciente) {
                let estado;
                let documento = paciente.documento;
                if (documento) {
                    estado = 'validado';
                } else if (['dni extranjero', 'pasaporte'].includes(paciente.tipoIdentificacion)) {
                    estado = 'EX';
                    documento = paciente.numeroIdentificacion;
                } else {
                    if (paciente.edad <= 5) {
                        estado = 'RN';
                        const tutorProgenitor = paciente.relaciones.find(rel => rel.relacion.nombre === 'progenitor/a') || paciente.relaciones.find(rel => rel.relacion.nombre === 'tutor');
                        documento = tutorProgenitor?.documento || tutorProgenitor?.numeroIdentificacion || null;
                    }
                }
                dataSearch = {
                    estado,
                    dni: documento,
                    fechaNac: moment(paciente.fechaNacimiento).format('YYYYMMDD'),
                    apellido: paciente.apellido,
                    fechaDesde: req.query.fechaDde,
                    fechaHasta: req.query.fechaHta
                };
            }
        } else {
            dataSearch = {
                estado: req.query.estado,
                dni: req.query.dni,
                fechaNac: req.query.fecNac,
                apellido: req.query.apellido,
                fechaDesde: req.query.fechaDde,
                fechaHasta: req.query.fechaHta
            };
        }
        if (req.params.id || dataSearch.dni) {
            const response = await laboratorioController.search(dataSearch);
            if (!response.length) {
                throw new Error(response || service);
            }
            res.json(response);
        } else {
            throw new Error('dni no informado');
        }
    } catch (err) {
        await laboratorioLog.error('resultado-protocolo', dataSearch, err, req);
        res.json('error: ' + err.message);
    }
});

export = router;
