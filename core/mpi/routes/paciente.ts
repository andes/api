import * as express from 'express';
import * as mongoose from 'mongoose';
import { paciente } from '../schemas/paciente';
import * as controller from '../controller/paciente';
import { Auth } from './../../../auth/auth.class';
import * as debug from 'debug';
import { log as andesLog } from '@andes/log';
import { logKeys } from '../../../config';
import { getObraSocial } from '../../../modules/obraSocial/controller/obraSocial';

const logD = debug('paciente-controller');
const router = express.Router();


router.post('/pacientes/validar/', async (req, res, next) => {
    if (!Auth.check(req, 'fa:get:renaper')) {
        return next(403);
    }
    const pacienteAndes = req.body;
    if (pacienteAndes && pacienteAndes.documento && pacienteAndes.sexo) {
        try {
            // chequeamos si el par dni-sexo ya existe en ANDES
            const resultadoCheck = await controller.checkRepetido(pacienteAndes, false);
            let resultado;
            if (resultadoCheck.dniRepetido) {
                resultado = { paciente: resultadoCheck.resultadoMatching[0].paciente, existente: true };
            } else {
                resultado = await controller.validarPaciente(pacienteAndes, req);
                resultado.existente = false;
            }
            res.json(resultado);
        } catch (err) {
            return next(err);
        }
    } else {
        return next(500);
    }
});

// Ruta para ir a buscar el paciente al federador nacional
router.post('/pacientes/federador/get', async (req, res, next) => {
    if (!Auth.check(req, 'fa:get:renaper')) { // vamos a usar el mismo permiso que el validar
        return next(403);
    }
    const pacienteAndes = req.body;
    if (pacienteAndes && pacienteAndes.documento && pacienteAndes.sexo) {
        try {
            const resultado = await controller.getPatientFromFederador(pacienteAndes, req);
            res.json(resultado);
        } catch (err) {
            return next(err);
        }
    } else {
        return next(500);
    }
});

// Search using filters
router.get('/pacientes/search', async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:getbyId')) {
        return next(403);
    }
    try {
        const result = await controller.matching({ type: 'search', filtros: req.query });
        res.send(result);
    } catch (err) {
        next(err);
    }
});


// Search
router.get('/pacientes', async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:getbyId')) {
        return next(403);
    }
    try {
        const result = await controller.matching(req.query);
        res.send(result);
    } catch (error) {
        return next(error);
    }

});


// Simple mongodb query by ObjectId --> better performance
router.get('/pacientes/:id', async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:getbyId')) {
        return next(403);
    }
    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);
    }
    try {
        const idPaciente = req.params.id;
        const { paciente: pacienteFound } = await controller.buscarPaciente(idPaciente);
        const pacienteBuscado: any = new paciente(pacienteFound);
        if (pacienteBuscado) {
            let pacienteConOS = pacienteBuscado.toObject({ virtuals: true });
            pacienteConOS.id = pacienteConOS._id;
            try {
                pacienteConOS.financiador = await getObraSocial(pacienteConOS);
                res.json(pacienteConOS);
            } catch (error) {
                return res.json(pacienteBuscado);
            }
        } else {
            return res.json(pacienteBuscado);
        }
    } catch (err) {
        return next('Paciente no encontrado');
    }

});

router.get('/pacientes/:id/foto/:fotoId', async (req, res, next) => {
    const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);
    }
    try {
        const idPaciente = req.params.id;
        const pacienteBuscado: any = await paciente.findById(idPaciente, '+foto');
        if (pacienteBuscado) {
            if (!pacienteBuscado.fotoId || !pacienteBuscado.foto || pacienteBuscado.foto == null) {
                res.writeHead(200, {
                    'Content-Type': 'image/svg+xml'
                });
                return res.end('<svg version="1.1" id="Layer_4" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="480px" height="535px" viewBox="0 0 480 535" enable-background="new 0 0 480 535" xml:space="preserve"><g id="Layer_3"><linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="240" y1="535" x2="240" y2="4.882812e-04"><stop  offset="0" style="stop-color:#C5C5C5"/><stop  offset="1" style="stop-color:#9A9A9A"/></linearGradient><rect fill="url(#SVGID_1_)" width="480" height="535"/></g><g id="Layer_2"><path fill="#FFFFFF" d="M347.5,250c0,59.375-48.125,107.5-107.5,107.5c-59.375,0-107.5-48.125-107.5-107.5c0-59.375,48.125-107.5,107.5-107.5C299.375,142.5,347.5,190.625,347.5,250z"/><path fill="#FFFFFF" d="M421.194,535C413.917,424.125,335.575,336.834,240,336.834c-95.576,0-173.917,87.291-181.194,198.166H421.194z"/></g></svg>');
            }
            const imagen = pacienteBuscado.foto;
            const match = imagen.match(base64RegExp);
            const mimeType = match[1];
            const data = match[2];
            const imgStream = Buffer.from(data, 'base64');

            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': imgStream.length
            });
            res.end(imgStream);
        } else {
            return next(404);
        }

    } catch (err) {
        return next(err);
    }

});

/**
 * @swagger
 * /pacientes:
 *   post:
 *     tags:
 *       - Paciente
 *     description: Cargar un paciente
 *     summary: Cargar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: organizacion
 *         description: objeto paciente
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 *       409:
 *         description: Un código de error con un array de mensajes de error
 */
router.post('/pacientes', async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:postAndes')) {
        return next(403);
    }
    try {
        let pacienteNuevo = req.body.paciente;
        let ignorarSugerencias = req.body.ignoreCheck;
        let incluirTemporales = req.body.paciente.estado !== 'validado';
        pacienteNuevo.activo = true;
        andesLog(req, logKeys.mpiInsert.key, null, 'postPacientes', req.body, ignorarSugerencias);
        if (pacienteNuevo.documento) {
            if (pacienteNuevo.scan) {
                // obtengo el numero de tramite del documento que contiene el scan del paciente
                const numTramite = Number(pacienteNuevo.scan.split('@')[0]);
                const valor = numTramite ? numTramite.toString() : '';
                pacienteNuevo.identificadores = valor ? [{ entidad: 'RENAPER', valor }] : null;
            }
            const resultado = await controller.checkRepetido(pacienteNuevo, incluirTemporales);
            if ((resultado && resultado.resultadoMatching.length <= 0) || (resultado && resultado.resultadoMatching.length > 0 && ignorarSugerencias && !resultado.macheoAlto && !resultado.dniRepetido)) {
                const pacienteObj = await controller.createPaciente(pacienteNuevo, req);
                return res.json(pacienteObj);
            } else {
                return res.json(resultado);
            }
        } else {
            const pacienteObjSinDocumento = await controller.createPaciente(pacienteNuevo, req);
            return res.json(pacienteObjSinDocumento);
        }
    } catch (error) {
        logD(error);
        return next(error);
    }
});

/**
 * @swagger
 * /pacientes:
 *   put:
 *     tags:
 *       - Paciente
 *     description: Actualizar un paciente
 *     summary: Actualizar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id del paciente
 *         required: true
 *         type: string
 *       - name: paciente
 *         description: objeto paciente
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */

router.put('/pacientes/:id', async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:putAndes')) {
        return next(403);
    }
    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);
    }
    const objectId = new mongoose.Types.ObjectId(req.params.id);
    const query = {
        _id: objectId
    };
    try {
        // Todo loguear posible duplicado si ignora el check
        let pacienteModificado = req.body.paciente;
        let ignorarSugerencias = req.body.ignoreCheck;
        let resultado = { resultadoMatching: [], macheoAlto: false, dniRepetido: false };
        if (pacienteModificado.estado !== 'validado') {
            resultado = await controller.checkRepetido(pacienteModificado, true);
        }

        if ((resultado && resultado.resultadoMatching.length <= 0) || (resultado && resultado.resultadoMatching.length > 0 && ignorarSugerencias && !resultado.macheoAlto && !resultado.dniRepetido)) {
            let patientFound: any = await paciente.findById(query).exec();

            if (patientFound) {
                const direccionOld = patientFound.direccion[0];
                const data = pacienteModificado;
                if (patientFound && patientFound.estado === 'validado' && !patientFound.isScan) {
                    delete data.documento;
                    delete data.estado;
                    delete data.sexo;
                    delete data.fechaNacimiento;
                }
                let pacienteUpdated = await controller.updatePaciente(patientFound, data, req);
                res.json(pacienteUpdated);
                // si el paciente esta validado y hay cambios en la direccion
                if (patientFound.estado === 'validado') {
                    if (data.direccion?.length > 0 && direccionOld?.geoReferencia && (JSON.stringify(data.direccion[0].geoReferencia) === JSON.stringify(direccionOld.geoReferencia)) &&
                        data.direccion[0]?.valor !== direccionOld?.valor) {
                        controller.actualizarGeoReferencia(pacienteUpdated, req);
                    }
                }
            }
        } else {
            return res.json(resultado);
        }
    } catch (error) {
        andesLog(req, logKeys.mpiUpdate.key, req.body._id, logKeys.mpiUpdate.operacion, null, 'Error actualizando paciente');
        return next(error);
    }
});
/**
 * @swagger
 * /pacientes/{id}:
 *   delete:
 *     tags:
 *       - Paciente
 *     description: Eliminar un paciente
 *     summary: Eliminar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de un paciente
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */
router.delete('/pacientes/:id', async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:deleteAndes')) {
        return next(403);
    }
    const objectId = new mongoose.Types.ObjectId(req.params.id);
    try {
        let patientFound: any = await controller.deletePacienteAndes(objectId);
        res.json(patientFound);
    } catch (error) {
        return next(error);
    }


});


/**
 * @swagger
 * /pacientes/{id}:
 *   patch:
 *     tags:
 *       - Paciente
 *     description: Modificar ciertos datos de un paciente
 *     summary: Modificar ciertos datos de un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de un paciente
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */


router.patch('/pacientes/:id', async (req, res, next) => {
    if (!Auth.check(req, 'mpi:paciente:patchAndes')) {
        return next(403);
    }
    try {
        let resultado = await controller.buscarPaciente(req.params.id);
        if (resultado) {
            switch (req.body.op) {
                case 'updateContactos':
                    controller.updateContactos(req, resultado.paciente);
                    resultado.paciente.markModified('contacto');
                    resultado.paciente.contacto = req.body.contacto;
                    break;
                case 'updateRelaciones':
                    controller.updateRelaciones(req, resultado.paciente);
                    break;
                case 'updateDireccion':
                    try {
                        await controller.updateDireccion(req, resultado.paciente);
                    } catch (err) { return next(err); }
                    break;
                case 'updateCarpetaEfectores':
                    try { // Actualizamos los turnos activos del paciente
                        const repetida = await controller.checkCarpeta(req, resultado.paciente);
                        if (!repetida) {
                            controller.updateCarpetaEfectores(req, resultado.paciente);
                            // controller.updateTurnosPaciente(resultado.paciente);
                        } else {
                            return next('El numero de carpeta ya existe');
                        }
                    } catch (error) { return next(error); }
                    break;
                case 'updateContactos': // Update de carpeta y de contactos
                    resultado.paciente.markModified('contacto');
                    resultado.paciente.contacto = req.body.contacto;
                    break;

                case 'updateRelacion':
                    controller.updateRelacion(req.body.dto, resultado.paciente);
                    break;
                case 'deleteRelacion':
                    controller.deleteRelacion(req, resultado.paciente);
                    break;
                case 'updateScan':
                    controller.updateScan(req, resultado.paciente);
                    break;
                case 'updateCuil':
                    controller.updateCuil(req, resultado.paciente);
                    break;
            }
            let pacienteAndes = resultado.paciente;
            Auth.audit(pacienteAndes, req);
            let pacienteSaved = await pacienteAndes.save();
            res.json(pacienteSaved);
        } else {
            return next('Paciente no encontrado');
        }
    } catch (error) {
        return next(error);
    }

});

router.get('/pacientes/:id/turnos', async (req, res, next) => {
    try {
        let resultado = await controller.buscarPaciente(req.params.id);
        if (resultado) {
            const turnosResult = await controller.getHistorialPaciente(req, resultado.paciente);
            res.json(turnosResult);
        } else {
            return next('Paciente no encontrado');
        }
    } catch (err) {
        return next(err);
    }
});

export = router;
