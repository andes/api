import * as express from 'express';
import { FHIR as fhirConf, IPS } from '../../../config.private';
import { SaludDigitalClient } from '../controller/autenticacion';

const router = express.Router();

router.get('/dominios/:id', async (req, res, next) => {
    try {
        const idPaciente = req.params.id;
        if (idPaciente) {
            const sdClient = await getClient();
            const dominios = await sdClient.getDominios(idPaciente);

            res.json(dominios);
        }
    } catch (err) {
        return next(err);
    }
});

router.get('/documentos', async (req, res, next) => {
    try {
        const custodian = req.query.custodian;
        const idPaciente = req.query.id;
        if (custodian && idPaciente) {
            const sdClient = await getClient();
            const docRef = await sdClient.solicitud({ custodian, fechaDesde: null, fechaHasta: null, patient: idPaciente, loinc: '60591-5' });
            if (docRef && docRef.length > 0) {
                const d = docRef[0];
                const ips = await sdClient.getBinary(d.urlBinary);
                res.json(ips);
            } else {
                res.send({});
            }
        } else {
            res.send({});
        }
    } catch (err) {
        return next(err);
    }

});

async function getClient() {
    const sdClient = new SaludDigitalClient({
        dominio: fhirConf.domain,
        host: fhirConf.ips_host,
        secret: fhirConf.secret,
        federador: fhirConf.federador_host
    });
    if (IPS.auth) {
        const payload = {
            name: IPS.name,
            role: IPS.role,
            ident: IPS.ident,
            sub: IPS.sub
        };
        await sdClient.obtenerToken(payload);
    }
    return sdClient;
}

export = router;
