import * as express from 'express';
import {SaludDigitalClient} from '../controller/autenticacion';
import {FHIR as fhirConf} from '../../../config.private';

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
            const ips = await sdClient.solicitud({custodian,fechaDesde: null, fechaHasta: null, patient: idPaciente, loinc:'60591-5'});
            // para mi lo anterior debería ser un docReg e ir a buscar cada IPS
            // const ipss = docRef.map(async (doc) => {
            //     const ips = await sdClient.getBinary(doc.urlBinary);
            //     return ips
            // });
            res.json(ips);
        }
        return []
    } catch (err) {
        return next(err);
    }

})

export = router;
