import * as express from 'express';
import { FHIR as fhirConf } from '../../../config.private';
import { SaludDigitalClient } from '../controller/autenticacion';

const router = express.Router();

router.get('/getDomains/:id', async (req, res, next) => {
    try {
        const idPaciente = req.params.id;
        if (idPaciente) {
            const sdClient = new SaludDigitalClient(fhirConf.domain, fhirConf.ips_host, fhirConf.secret);
            const dominios = await sdClient.getDominios(idPaciente);
            res.json(dominios);
        }
    } catch (err) {
        return next(err);
    }
});

router.get('/getDocuments', async (req, res, next) => {
    try {
        const custodian = req.query.custodian;
        const idPaciente = req.query.id;
        if (custodian && idPaciente) {
            const sdClient = new SaludDigitalClient(fhirConf.domain, fhirConf.ips_host, fhirConf.secret);
            // Le dejo posiblidad de filtrar por fechas
            const docRef = await sdClient.solicitud({ custodian, fechaDesde: null, fechaHasta: null, patient: idPaciente, loinc: '60591-5' });
            if (docRef && docRef.length > 0) {
                for (let d of docRef) {
                    const ips = await sdClient.getBinary(d.urlBinary);
                    res.json(ips);
                }
            } else {
                res.send([]);
            }
        } else {
            res.send([]);
        }
    } catch (err) {
        return next(err);
    }

});

export = router;
