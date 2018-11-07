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

router.get('/hojatrabajo', async (req, res, next) => {
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
    } else {
        HojaTrabajo.find().then((hojas: any[]) => {
            res.json(hojas);
        });
    }
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
        codigo: 'qwerty',
        responsable: prof,
        protocolo: {
            imprimirPrioridad: 1,
            imprimirOrigen: 0,
            imprimirCorrelativo: 0,
            imprimirDiagnostico: 0,
            idUltimoProtocoloListado: new ObjectId()
        },
        paciente: {
            imprimirApellidoNombre: 1,
            imprimirEdad: 0,
            imprimirSexo: 1,
            imprimirAntecedente: 0,
            cantidadLineaAdicional: 12,
        },
        papel: {
            formato: 1,
            orientacion: 1,
            anchoColumnasMilimetros: 25,
            imprimirFechaHora: 0,
            imprimirMedico: 1,
            textoInferiorDerecha: 'Observaciones',
            textoInferiorIzquierda: 'firma profesional',
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
