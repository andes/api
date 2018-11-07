import { SnomedConcept } from './../../../../modules/rup/schemas/snomed-concept';
import { ObjectId } from 'bson';
import { jobs } from './../../../../config.private';
import { Practica } from './../schemas/practica';
import * as express from 'express';
import { Mongoose, Types } from 'mongoose';
import { HojaTrabajo } from './../schemas/hojaTrabajo';
import { Auth } from '../../../../auth/auth.class';
import { model as Efector } from '../../../../core/tm/schemas/organizacion';
import { profesional as Profesional } from './../../../../core/tm/schemas/profesional';


let router = express.Router();

router.get('/hojatrabajo/:id', async (req, res, next) => {
    let query;
    if (req.params.id) {
        query = HojaTrabajo.findById(req.params.id);
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            if (!data) {
                return next(404);
            }
            res.json(data);
        });
    }
});

router.get('/hojatrabajo', async (req, res, next) => {
    HojaTrabajo.find().then((hojas: any[]) => {
        res.json(hojas);
    });
});


router.post('/hojatrabajo', async (req, res, next) => {
    /*
    // con estos datos funciona
    const labo = await Efector.findById('57e9670e52df311059bc8964');
    const prof = await Profesional.findById('58f74fd4d03019f919ea1d60');
    const pract1 = await Practica.findById('5bc6173ec783fa583ce5fa9e');
    const pract2 = await Practica.findById('5bc6173ec783fa583ce5faa0');

    let hoja = {
        laboratorio: labo,
        nombre: 'hello labo',
        responsable: prof,
        area: { nombre: 'QUIMICA CLINICA', conceptoSnomed: { conceptId: '310076001' } },
        protocolo: {
            imprimirPrioridad: 1,
            imprimirOrigen: 0,
            imprimirDiagnostico: 1
        },
        paciente: {
            imprimirApellidoNombre: 1,
            imprimirEdad: 0,
            imprimirSexo: 1,
            cantidadLineaAdicional: 5
        },
        papel: {
            formato: 1, // A4 | Oficio
            orientacion: 0, // Horizontal | Vertical
            anchoColumnasMilimetros: 50,
            textoInferiorDerecha: 'texto inferior derecha',
            textoInferiorIzquierda: 'texto inferior izquierda',
        },
        baja: 0,
        practicas: [{ nombre: 'insu60', practica: pract1 }, { nombre: 'Basofilos', practica: pract2 }]
    };
    */

    const hojatrabajo = req.body;

    const data = new HojaTrabajo(hojatrabajo);

    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
