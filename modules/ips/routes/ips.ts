import * as express from 'express';

const router = express.Router();

// ESTE CODIGO ESTA DEPRECADO Y YA FUE MODIFICADO EN OTRO BRANCH

// router.get('/document/:id', async (req, res, next) => {
//     try {
//         const saludDigital = new SaludDigitalClient(FHIR.domain, FHIR.ips_host, FHIR.secret);
//         const custodian = req.query.custodian;
//         const bundle = await saludDigital.solicitud({ patient: req.params.id, custodian, loinc: '60591-5' });
//         return res.json(bundle);
//     } catch (err) {
//         return next(err);
//     }
// });

// router.get('/binary:url', async (req, res, next) => {
//     try {
//         const saludDigital = new SaludDigitalClient(FHIR.domain, FHIR.ips_host, FHIR.secret);
//         const urlBinary = req.params.urlBinary;
//         const bundle = await saludDigital.getBinary(urlBinary);
//         return res.json(bundle);
//     } catch (err) {
//         return next(err);
//     }
// });
export = router;
