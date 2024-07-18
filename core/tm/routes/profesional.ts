import { AndesDrive } from '@andes/drive';
import { EventCore } from '@andes/event-bus';
import { log } from '@andes/log';
import * as base64 from 'base64-stream';
import * as express from 'express';
import * as fs from 'fs';
import { Types } from 'mongoose';
import * as stream from 'stream';
import { Auth } from '../../../auth/auth.class';
import { sendSms } from '../../../utils/roboSender/sendSms';
import { makePattern, toArray } from '../../../utils/utils';
import { streamToBase64 } from '../controller/file-storage';
import { formacionCero, matriculaCero, migrarTurnos, saveFirma, filtrarProfesionalesPorPrestacion, saveImage, deleteFirmaFotoTemporal } from '../controller/profesional';
import { makeFsFirmaAdmin } from '../schemas/firmaAdmin';
import { makeFsFirma } from '../schemas/firmaProf';
import { makeFsFirmaOnline } from '../schemas/firmaRenovacionOnline';
import { makeFsImagenOnline } from '../schemas/imagenRenovacionOnline';
import { makeFs } from '../schemas/imagenes';
import { Organizacion } from '../schemas/organizacion';
import { Profesional } from '../schemas/profesional';
import { profesion } from '../schemas/profesion_model';
import { defaultLimit, maxLimit } from './../../../config';
import { userScheduler } from './../../../config.private';
import { getTemporyTokenGenerarUsuario } from '../../../auth/auth.controller';
import { services } from '../../../services';
import { Matching } from '@andes/match';
import { mpi, algoritmo } from './../../../config';

import moment = require('moment');


const router = express.Router();

router.get('/profesionales/ultimoPosgrado', async (req, res, next) => {
    const query = [
        { $unwind: '$formacionPosgrado' },
        { $unwind: '$formacionPosgrado.matriculacion' },
        { $sort: { 'formacionPosgrado.matriculacion.matriculaNumero': -1 } },
        { $limit: 1 }
    ];
    const data = await toArray(Profesional.aggregate(query).cursor({}).exec());
    const ultimoNumero = data[0].formacionPosgrado.matriculacion.matriculaNumero;
    res.json(ultimoNumero);
});

router.get('/profesionales/estadisticas', async (req, res, next) => {
    const estadisticas = {};
    const total = Profesional.count({ profesionalMatriculado: true });
    const totalMatriculados = Profesional.count({ rematriculado: 0, profesionalMatriculado: true });
    const totalRematriculados = Profesional.count({ rematriculado: 1, profesionalMatriculado: true });
    Promise.all([total, totalMatriculados, totalRematriculados]).then(values => {
        estadisticas['total'] = values[0];
        estadisticas['totalMatriculados'] = values[1];
        estadisticas['totalRematriculados'] = values[2];
        res.json(estadisticas);
    });
});

router.get('/profesionales/exportSisa', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'matriculaciones:profesionales:getProfesional')) {
        return next(403);
    }
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;
    const profesionaleSisaTotal = [];

    const datos = await Profesional.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            'formacionGrado.fechaDeInscripcion': {
                                $gte: moment(fechaDesde).startOf('day').toDate(),
                                $lte: moment(fechaHasta).endOf('day').toDate()
                            }
                        },
                        { profesionalMatriculado: true }
                    ]
                }
            },
            {
                $unwind: '$formacionGrado'
            },
            {
                $match: {
                    'formacionGrado.fechaDeInscripcion': {
                        $gte: moment(fechaDesde).startOf('day').toDate(),
                        $lte: moment(fechaHasta).endOf('day').toDate()
                    }
                }
            },

        ]);

    for (let index = 0; index < datos.length; index++) {
        const profesionalSisa = {};

        const unProfesional = datos[index];
        profesionalSisa['ID_PROFESIONAL'] = '';
        profesionalSisa['ID_PROFESIONAL_PROFESION'] = '';
        profesionalSisa['ID_PROFESIONAL_MATRICULA'] = '';
        profesionalSisa['ID_TIPODOC'] = 1;
        profesionalSisa['NRODOC'] = unProfesional.documento;
        profesionalSisa['NOMBRE'] = unProfesional.nombre;
        profesionalSisa['APELLIDO'] = unProfesional.apellido;
        profesionalSisa['SEXO'] = (unProfesional.sexo === 'femenino' || unProfesional.sexo === 'Femenino') ? 'F' : 'M';
        profesionalSisa['FECHA_NACIMIENTO'] = moment(unProfesional.fechaNacimiento).format('DD/MM/YYYY');
        profesionalSisa['ID_PAIS_NACIMIENTO'] = '0';
        profesionalSisa['ID_LOC_NACIMIENTO'] = '0';
        profesionalSisa['ID_PAIS'] = '0';
        const domicilio = unProfesional.domicilios.find(x => x.tipo === 'real');
        profesionalSisa['CALLE'] = domicilio ? domicilio.valor : '';
        profesionalSisa['CALLE_NRO'] = '-';
        profesionalSisa['CALLE_PISO'] = '-';
        profesionalSisa['CALLE_DPTO'] = '-';
        profesionalSisa['ID_LOCALIDAD_DOMICILIO'] = '0';
        profesionalSisa['ID_PROVINCIA_DOMICILIO'] = '15';
        profesionalSisa['ID_PAIS_DOMICILIO'] = '200';
        const tel_celular = unProfesional.contactos.find(x => x.tipo === 'celular' && x.valor);
        const tel_fijo = unProfesional.contactos.find(x => x.tipo === 'fijo' && x.valor);
        const email = unProfesional.contactos.find(x => x.tipo === 'email' && x.valor);
        profesionalSisa['TIENE_TELEFONO'] = (tel_celular || tel_fijo || email) ? 'SI' : 'NO';
        profesionalSisa['ID_TIPO_TE1'] = tel_fijo ? '1' : '';
        profesionalSisa['ID_TIPO_TE2'] = tel_celular ? '2' : '';
        profesionalSisa['ID_TIPO_TE3'] = '';
        profesionalSisa['ID_TIPO_TE4'] = '';
        profesionalSisa['TE1'] = tel_fijo ? tel_fijo.valor : '';
        profesionalSisa['TE2'] = tel_celular ? tel_celular.valor : '';
        profesionalSisa['TE3'] = '';
        profesionalSisa['TE4'] = '';
        profesionalSisa['LIBRO'] = '';
        profesionalSisa['FOLIO'] = '';
        profesionalSisa['ACTA'] = '';
        profesionalSisa['EXPEDIENTE'] = '';
        profesionalSisa['EMAIL'] = email ? email.valor : '';
        profesionalSisa['EMAIL2'] = '';
        profesionalSisa['CUIL'] = unProfesional.cuit ? unProfesional.cuit : '';
        const fallecido = unProfesional.fechaFallecimiento ? 'SI' : 'NO';
        profesionalSisa['FALLECIDO'] = fallecido;
        profesionalSisa['FECHA_FALLECIDO'] = fallecido === 'SI' ? unProfesional.fecha_fallecido : '';
        profesionalSisa['HABILITADO'] = 'SI';
        const profesionDeReferencia: any = await profesion.findOne({ codigo: unProfesional.formacionGrado.profesion.codigo });
        profesionalSisa['ID_PROFESION_REFERENCIA'] = (profesionDeReferencia && profesionDeReferencia.profesionCodigoRef) ? profesionDeReferencia.profesionCodigoRef : '';
        profesionalSisa['ID_PROFESION'] = (unProfesional.formacionGrado && unProfesional.formacionGrado.profesion) ? unProfesional.formacionGrado.profesion.codigo : '';
        profesionalSisa['TITULO'] = unProfesional.formacionGrado ? unProfesional.formacionGrado.titulo : '';
        const codigoInstitucion = unProfesional.formacionGrado ? unProfesional.formacionGrado.entidadFormadora.codigo : '0';
        profesionalSisa['ID_INSTITUCION_FORMADORA'] = codigoInstitucion;
        profesionalSisa['FECHA_TITULO'] = moment(unProfesional.formacionGrado.fechaEgreso).format('DD/MM/YYYY');
        profesionalSisa['ID_INSTITUCION_SEDE'] = '';
        profesionalSisa['REVALIDA'] = 'NO';
        profesionalSisa['ID_INSTITUCION_REVALIDA'] = '';
        profesionalSisa['FECHA_REVALIDA'] = '';
        profesionalSisa['ID_PROVINCIA_MATRICULA'] = '15';
        profesionalSisa['MATRICULA'] = (unProfesional.formacionGrado && unProfesional.formacionGrado.matriculacion) ? unProfesional.formacionGrado.matriculacion[unProfesional.formacionGrado.matriculacion.length - 1].matriculaNumero : '';
        profesionalSisa['FECHA_MATRICULA'] = moment(unProfesional.formacionGrado.fechaDeInscripcion).format('DD/MM/YYYY');
        profesionalSisa['ID_SITUACION_MATRICULA'] = '1';
        profesionalSisa['COMENTARIO'] = '';
        profesionalSisa['SSS'] = 'NO';
        profesionalSisa['SSS_CERTIFICADO'] = '';
        profesionalSisa['SSS_FECHA'] = '';
        profesionalSisa['ID_SSS_PROVINCIA'] = '';
        profesionalSisa['ID_SSS_PROVINCIA2'] = '';
        profesionalSisa['ID_SSS_PROVINCIA3'] = '';
        profesionalSisa['REMATRICULACION'] = 'NO';
        profesionaleSisaTotal.push(profesionalSisa);
    }

    res.status(201).json(profesionaleSisaTotal);
});

router.get('/profesionales/guia', async (req, res, next) => {
    const opciones = {};

    opciones['profesionalMatriculado'] = true;
    if (req.query.documento) {
        opciones['documento'] = req.query.documento;
    }

    if (req.query.codigoProfesion) {
        opciones['formacionGrado.profesion.codigo'] = Number(req.query.codigoProfesion);
    }
    if (req.query.numeroMatricula) {
        opciones['formacionGrado.matriculacion.matriculaNumero'] = Number(req.query.numeroMatricula);
    }
    if (req.query.apellido) {
        opciones['apellido'] = makePattern(req.query.apellido);
    }
    if (req.query.nombre) {
        opciones['nombre'] = makePattern(req.query.nombre);
    }
    if (req.query.email) {
        opciones['contactos.valor'] = req.query.email;
    }

    if (opciones['formacionGrado.profesion.codigo'] && Object.keys(opciones).length === 1) {
        return next('Parámetros incorrectos');
    }

    if (Object.keys(opciones).length) {
        const datosGuia: any = await Profesional.find(opciones);
        const resultado = [];
        if (datosGuia.length > 0) {
            datosGuia.forEach(element => {
                const formGradFilter = element.formacionGrado.filter(formGrado => formGrado.matriculacion !== null);
                resultado.push({
                    id: element.id,
                    nombre: element.nombre ? element.nombre : '',
                    sexo: element.sexo ? element.sexo : '',
                    apellido: element.apellido ? element.apellido : '',
                    documento: element.documento ? element.documento : '',
                    cuit: element.cuit ? element.cuit : '',
                    nacionalidad: element.nacionalidad ? element.nacionalidad.nombre : '',
                    habilitado: element.habilitado,
                    profesiones: formGradFilter
                });
            });
        }
        res.json(resultado);
    } else {
        res.json([]);
    }
});

router.get('/profesionales/matching', async (req, res, next) => {
    if (!req.query.documento || !req.query.sexo) {
        return next('Error en operación de matching. Faltan parámetros.');
    }
    let profesionales: any = await Profesional.find({
        documento: req.query.documento,
        sexo: req.query.sexo
    });
    profesionales = profesionales.map(p => {
        return {
            id: p.id,
            nombre: p.nombre,
            sexo: p.sexo,
            apellido: p.apellido,
            documento: p.documento,
            fechaNacimiento: p.fechaNacimiento,
            profesionalMatriculado: p.profesionalMatriculado
        };
    });
    res.json(profesionales);
});

router.get('/profesionales/foto/:id*?', Auth.authenticate(), async (req: any, res, next) => {
    const id = req.query.id;
    if (!Auth.check(req, 'matriculaciones:profesionales:getProfesionalFoto') && String(req.user.profesional) !== id) {
        return next(403);
    }
    const img = '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';

    try {
        if (req.query.id) {
            const idProf = req.query.id;
            let fotoProf;
            let metadataFind;

            if (req.query.matricula) {
                const matricula = parseInt(req.query.matricula, 10);
                fotoProf = makeFsImagenOnline();
                metadataFind = {
                    'metadata.idProfesional': idProf,
                    'metadata.matricula': matricula
                };
            } else {
                fotoProf = makeFs();
                metadataFind = {
                    'metadata.idProfesional': idProf
                };
            }

            const file = await fotoProf.findOne(metadataFind);
            if (file) {
                const readStream = await fotoProf.readFile({ _id: file._id });
                const _img = await streamToBase64(readStream);
                return res.json(_img);
            }
            return res.json(img);
        }

    } catch (ex) {
        return next(ex);
    }
});
router.get('/profesionales/firma', Auth.authenticate(), async (req: any, res, next) => {
    try {
        if (req.query.id) {
            const id = req.query.id;
            let fotoProf;
            let metadataFind;

            if (req.query.matricula) {
                const matricula = parseInt(req.query.matricula, 10);
                fotoProf = makeFsFirmaOnline();
                metadataFind = {
                    'metadata.idProfesional': id,
                    'metadata.matricula': matricula
                };
            } else {
                fotoProf = makeFsFirma();
                metadataFind = {
                    'metadata.idProfesional': id
                };
            }
            const file = await fotoProf.findOne(metadataFind);
            if (file) {
                const readStream = await fotoProf.readFile({ _id: file._id });
                const firma = await streamToBase64(readStream);
                if (firma) {
                    return res.json(firma);
                }
            }
            return res.json({});

        }
        if (req.query.firmaAdmin) {
            const idAdmin = req.query.firmaAdmin;
            const fotoAdmin = makeFsFirmaAdmin();
            const file = await fotoAdmin.findOne({ 'metadata.idSupervisor': idAdmin });
            if (file) {
                const idFile = file._id;
                const readStream = await fotoAdmin.readFile({ _id: idFile });
                const _img = await streamToBase64(readStream);
                if (_img) {
                    const firmaAdmin = {
                        firma: _img,
                        administracion: file.metadata.administracion
                    };
                    return res.json(firmaAdmin);
                }
            }
            return res.json({});

        }
    } catch (ex) {
        return next(ex);
    }

});

router.get('/profesionales/matricula/:id', (req, resp, errHandler) => {
    const oCredencial = {
        foto: null,
        firmaProfesional: null,
        firmaSupervisor: null
    };
    Profesional.findById(req.params.id).exec((err, prof: any) => {
        if (err) {
            return errHandler(err);
        }
        const pathFirmaSupervisor = './modules/matriculaciones/uploads/firmas/firma-supervisor.jpg';
        const pathFirmaProfesional = './modules/matriculaciones/uploads/firmas/' + prof.ultimaFirma.imgArchivo;
        const pathFoto = './modules/matriculaciones/uploads/fotos/prof-' + req.params.profId + '.jpg';

        fs.readFile(pathFoto, (errReadFoto, fotoB64) => {
            if (errReadFoto) {
                return errHandler(errReadFoto);
            }

            oCredencial.foto = 'data:image/jpeg;base64,' + new Buffer(fotoB64).toString('base64');

            fs.readFile(pathFirmaProfesional, (errReadFirma, firmaProfB64) => {
                if (errReadFirma) {
                    return errHandler(errReadFirma);
                }

                oCredencial.firmaProfesional = 'data:image/jpeg;base64,' + new Buffer(firmaProfB64).toString('base64');

                fs.readFile(pathFirmaSupervisor, (errReadFirmaSup, firmaSupB64) => {
                    if (errReadFirmaSup) {
                        return errHandler(errReadFirmaSup);
                    }

                    oCredencial.firmaSupervisor = 'data:image/jpeg;base64,' + new Buffer(firmaSupB64).toString('base64');
                    resp.json(oCredencial);
                });
            });
        });

    });
});

router.get('/profesionales/matriculas', Auth.authenticate(), async (req, res, next) => {
    const match = {};
    const match2 = {};
    if (req.query.matriculacion) {
        match['profesionalMatriculado'] = true;
    }

    if (req.query.rematriculado) {
        match['rematriculado'] = true;
    }

    if (req.query.matriculado) {
        match['rematriculado'] = false;
    }
    if (req.query.especialidadCodigo) {
        match2['formacionPosgrado.especialidad.codigo'] = parseInt(req.query.especialidadCodigo, 10);
    }
    if (req.query.profesionCodigo) {
        match2['formacionGrado.profesion.codigo'] = parseInt(req.query.profesionCodigo, 10);
    }
    let unwindOptions = {};
    let projections = {};
    if (req.query.tipoMatricula === 'grado') {
        match['formacionGrado.matriculacion.0'] = { $exists: true };

        if (req.query.estado) {
            if (req.query.estado === 'Vigentes') {
                match['formacionGrado.matriculado'] = true;
            }
            if (req.query.estado === 'Suspendidas') {
                match['formacionGrado.matriculado'] = false;
            }
        }
        if (req.query.vencidas) {
            match2['ultimaMatricula.fin'] = { $lte: new Date() };
        }
        if (req.query.bajaMatricula) {
            match2['ultimaMatricula.baja.fecha'] = { $nin: [null, ''] };
        }
        unwindOptions = { path: '$formacionGrado' };
        projections = {
            habilitado: 1,
            nombre: 1,
            apellido: 1,
            tipoDocumento: 1,
            documento: 1,
            documentoVencimiento: 1,
            cuit: 1,
            fechaNacimiento: 1,
            lugarNacimiento: 1,
            fechaFallecimiento: 1,
            nacionalidad: 1,
            sexo: 1,
            contactos: 1,
            domicilios: 1,
            fotoArchivo: 1,
            firmas: 1,
            incluidoSuperintendencia: 1,
            formacionPosgrado: 1,
            'formacionGrado.profesion': 1,
            'formacionGrado.entidadFormadora': 1,
            'formacionGrado.titulo': 1,
            'formacionGrado.fechaTitulo': 1,
            'formacionGrado.fechaEgreso': 1,
            'formacionGrado.renovacion': 1,
            'formacionGrado.papelesVerificados': 1,
            'formacionGrado.matriculado': 1,
            'formacionGrado.exportadoSisa': 1,
            'formacionGrado.fechaDeInscripcion': 1,
            ultimaMatricula: { $arrayElemAt: ['$formacionGrado.matriculacion', -1] },
            sanciones: 1,
            notas: 1,
            rematriculado: 1,
            agenteMatriculador: 1,
            supervisor: 1,
            OtrosDatos: 1,
            idRenovacion: 1,
            documentoViejo: 1,
            turno: 1,
            profesionalMatriculado: 1
        };

    } else {

        match['formacionPosgrado.matriculacion.0'] = { $exists: true };

        if (req.query.estado) {
            if (req.query.estado === 'Vigentes') {
                match['formacionPosgrado.matriculado'] = true;
            }
            if (req.query.estado === 'Suspendidas') {
                match['formacionPosgrado.matriculado'] = false;
            }
        }
        if (req.query.bajaMatricula) {
            match2['ultimaMatriculaPosgrado.baja.fecha'] = { $nin: [null, ''] };
        }
        if (req.query.vencidas) {
            match2['formacionPosgrado.tieneVencimiento'] = true;
            match2['ultimaMatriculaPosgrado.fin'] = { $lte: new Date() };
        }
        unwindOptions = { path: '$formacionPosgrado' };
        projections = {
            habilitado: 1,
            nombre: 1,
            apellido: 1,
            tipoDocumento: 1,
            documento: 1,
            documentoVencimiento: 1,
            cuit: 1,
            fechaNacimiento: 1,
            lugarNacimiento: 1,
            fechaFallecimiento: 1,
            nacionalidad: 1,
            sexo: 1,
            contactos: 1,
            domicilios: 1,
            fotoArchivo: 1,
            firmas: 1,
            incluidoSuperintendencia: 1,
            formacionGrado: 1,
            'formacionPosgrado.profesion': 1,
            'formacionPosgrado.institucionFormadora': 1,
            'formacionPosgrado.especialidad': 1,
            'formacionPosgrado.fechaIngreso': 1,
            'formacionPosgrado.fechaEgreso': 1,
            'formacionPosgrado.observacion': 1,
            'formacionPosgrado.certificacion': 1,
            'formacionPosgrado.fechasDeAltas': 1,
            'formacionPosgrado.matriculado': 1,
            'formacionPosgrado.revalida': 1,
            'formacionPosgrado.papelesVerificados': 1,
            'formacionPosgrado.exportadoSisa': 1,
            'formacionPosgrado.tieneVencimiento': 1,
            'formacionPosgrado.notas': 1,
            ultimaMatriculaPosgrado: { $arrayElemAt: ['$formacionPosgrado.matriculacion', -1] },
            sanciones: 1,
            notas: 1,
            rematriculado: 1,
            agenteMatriculador: 1,
            supervisor: 1,
            OtrosDatos: 1,
            idRenovacion: 1,
            documentoViejo: 1,
            turno: 1,
            profesionalMatriculado: 1
        };
    }
    if (req.query.fechaDesde && req.query.fechaHasta) {
        if (req.query.matriculasPorVencer) {
            if (req.query.tipoMatricula === 'grado') {
                match2['$and'] = [{ 'ultimaMatricula.fin': { $gte: new Date(req.query.fechaDesde) } }, { 'ultimaMatricula.fin': { $lte: new Date(req.query.fechaHasta) } }];
            } else {
                match2['$and'] = [{ 'ultimaMatriculaPosgrado.fin': { $gte: new Date(req.query.fechaDesde) } }, { 'ultimaMatriculaPosgrado.fin': { $lte: new Date(req.query.fechaHasta) } }];
            }
        } else if (req.query.matriculasPorVencer === false) {
            if (req.query.tipoMatricula === 'grado') {
                match2['$and'] = [{ 'ultimaMatricula.inicio': { $gte: new Date(req.query.fechaDesde) } }, { 'ultimaMatricula.inicio': { $lte: new Date(req.query.fechaHasta) } }];
            } else {
                match2['$and'] = [{ 'ultimaMatriculaPosgrado.inicio': { $gte: new Date(req.query.fechaDesde) } }, { 'ultimaMatriculaPosgrado.inicio': { $lte: new Date(req.query.fechaHasta) } }];
            }
        }
    }

    const pipeline = [];
    pipeline.push({ $match: match });
    pipeline.push({ $unwind: unwindOptions });
    pipeline.push({ $project: projections });
    pipeline.push({ $match: match2 });
    if (!req.query.exportarPlanillaCalculo) {
        const radix = 10;
        let skip = 0;
        let limit = 0;
        skip = parseInt(req.query.skip || 0, radix);
        limit = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });
    }
    if (!req.query.exportarPlanillaCalculo) {
        const data = await Profesional.aggregate(pipeline);
        try {
            res.json(data);
        } catch (error) {
            return next(error);
        }
    } else {
        const matriculas = await toArray(Profesional.aggregate(pipeline).cursor({}).exec());
        const responseArray = createResponseArray(matriculas, req);
        res.status(201).json(responseArray);
    }
});

router.get('/profesionales/documentos/:id', async (req, res, next) => {
    res.json(await AndesDrive.find(req.params.id));
});


router.get('/profesionales/renovacion', Auth.authenticate(), async (req, res, next) => {
    const profesionalParams: any = {};
    const solicitudParams: any = {};

    profesionalParams['$and'] = [
        { updatedAt: { $gte: req.query.fechaDesde || moment().startOf('day').toDate() } },
        { updatedAt: { $lte: req.query.fechaHasta || moment().endOf('day').toDate() } }
    ];

    if (req.query.zonaSanitaria) {
        let organizaciones = await Organizacion.find({ 'zonaSanitaria._id': Types.ObjectId(req.query.zonaSanitaria) });
        organizaciones = organizaciones.map((org: any) => org._id.toString());
        profesionalParams['updatedBy.organizacion.id'] = { $in: organizaciones };
    }

    profesionalParams['formacionGrado.papelesVerificados'] = false;

    if (req.query.documento) {
        solicitudParams['documento'] = makePattern(req.query.documento);
    }
    if (req.query.apellido) {
        solicitudParams['apellido'] = { $regex: makePattern(req.query.apellido) };
    }
    if (req.query.nombre) {
        solicitudParams['nombre'] = { $regex: makePattern(req.query.nombre) };
    }
    if (req.query.profesion) {
        const profesionSearch = parseInt(req.query.profesion, 10);
        solicitudParams['$or'] = [
            { 'formacionGrado.profesion.codigo': profesionSearch },
            { 'formacionPosgrado.profesion.codigo': profesionSearch }
        ];
    }
    if (req.query.numeroMatriculaGrado) {
        solicitudParams['formacionGrado.matriculacion.matriculaNumero'] = req.query.numeroMatriculaGrado;
    }

    const skip: number = parseInt(req.query.skip || 0, 10);
    const limit: number = Math.min(parseInt(req.query.limit || defaultLimit, 10), maxLimit);
    const profesional = await Profesional.find(profesionalParams).skip(skip).limit(limit);
    res.json(profesional);
});

router.get('/profesionales/:id', Auth.authenticate(), async (req, res, next) => {
    const profesional = await Profesional.findById(req.params.id);
    res.json(profesional);
});

router.get('/profesionales', Auth.authenticate(), async (req, res, next) => {
    const opciones = {};
    let query;
    if (req.query.fechaDesde || req.query.fechaHasta) {
        opciones['$and'] = [
            { updatedAt: { $gte: req.query.fechaDesde || moment().startOf('day').toDate() } },
            { updatedAt: { $lte: req.query.fechaHasta || moment().endOf('day').toDate() } }
        ];
    }

    if (req.query.nombre) {
        opciones['nombre'] = {
            $regex: makePattern(req.query.nombre)
        };
    }

    if (req.query.matriculacion) {
        opciones['profesionalMatriculado'] = true;
    }

    if (req.query.profesionalMatriculado) {
        opciones['profesionalMatriculado'] = false;
    }

    if (req.query.apellido) {
        opciones['apellido'] = {
            $regex: makePattern(req.query.apellido)
        };
    }
    if (req.query.estado) {
        if (req.query.estado === 'Vigentes') {
            req.query.estado = true;
        }
        if (req.query.estado === 'Suspendidas') {
            req.query.estado = false;
        }
        opciones['formacionGrado.matriculado'] = req.query.estado;
    }
    if (req.query.profesion) {
        const profesionSearch = parseInt(req.query.profesion, 10);
        opciones['$or'] = [
            { 'formacionGrado.profesion.codigo': profesionSearch },
            { 'formacionPosgrado.profesion.codigo': profesionSearch }
        ];
    }
    if (req.query.renovacionSelected) {
        if (req.query.renovacionSelected === 'no aplica') {
            opciones['formacionGrado.renovacionOnline'] = null;
        }
        if (req.query.renovacionSelected !== 'no aplica') {
            opciones['formacionGrado.renovacionOnline.estado'] = req.query.renovacionSelected;
        }

    }
    if (req.query.estadoE) {
        if (req.query.estadoE === 'Vigentes') {
            req.query.estadoE = true;
        }
        if (req.query.estadoE === 'Suspendidas') {
            req.query.estadoE = false;
        }
        opciones['formacionPosgrado.matriculado'] = req.query.estadoE;
    }

    if (req.query.habilitado !== undefined && req.query.habilitado !== null) {
        if (req.query.habilitado === false) {
            opciones['habilitado'] = false;
        } else {
            opciones['habilitado'] = { $ne: false };
        }
    }

    if (req.query.documento) {
        opciones['documento'] = req.query.busquedaExacta ? req.query.documento : makePattern(req.query.documento);
    }
    if (req.query.numeroMatriculaGrado) {
        opciones['formacionGrado.matriculacion.matriculaNumero'] = req.query.numeroMatriculaGrado;
    }
    if (req.query.numeroMatriculaEspecialidad) {
        opciones['formacionPosgrado.matriculacion.matriculaNumero'] = req.query.numeroMatriculaEspecialidad;
    }

    if (req.query.bajaMatricula) {
        opciones['formacionGrado.matriculacion.baja.motivo'] = { $nin: [null, ''] };
        opciones['formacionPosgrado.matriculacion.baja.motivo'] = { $nin: [null, ''] };
    }

    if (req.query.rematriculado) {
        opciones['rematriculado'] = true;
    }

    if (req.query.matriculado) {
        opciones['rematriculado'] = false;
    }

    if (req.query.id) {
        opciones['_id'] = req.query.id;
    }

    if (req.query.fechaNacimiento) {
        opciones['fechaNacimiento'] = req.query.fechaNacimiento;
    }

    if (req.query.numeroMatricula) {
        opciones['matriculas.numero'] = req.query.numeroMatricula;
    }

    if (req.query.especialidad) {
        opciones['especialidad.nombre'] = {
            $regex: makePattern(req.query.especialidad)
        };
    }

    const radix = 10;
    const skip: number = parseInt(req.query.skip || 0, radix);
    const limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);

    if (req.query.nombreCompleto) {
        const tokensQuery = Profesional.search(req.query.nombreCompleto);
        query = Profesional
            .find({ $and: tokensQuery['$and'], ...opciones }).
            sort({
                apellido: 1,
                nombre: 1
            });
    } else if (!req.query.exportarPlanillaCalculo) {
        query = Profesional.find(opciones).skip(skip).limit(limit);
    } else {
        query = Profesional.find(opciones);
    }

    if (req.query.fields) {
        query.select(req.query.fields);
    }

    query.exec(async (err, data) => {
        if (err) {
            return next(err);
        }

        if (req.query.prestaciones) {
            let prestaciones = req.query.prestaciones;
            if (!Array.isArray(prestaciones)) {
                prestaciones = [prestaciones];
            }
            data = await filtrarProfesionalesPorPrestacion(data, prestaciones, req.user.organizacion.id);
        }

        if (!req.query.exportarPlanillaCalculo) {
            res.json(data);
        } else {
            const profesionales = [];
            for (let i = 0; i < data.length; i++) {
                const prof = {};

                prof['nombre'] = data[i].nombre;
                prof['apellido'] = data[i].apellido;
                prof['tipoDocumento'] = data[i].tipoDocumento;
                prof['documento'] = data[i].documento;
                prof['documentoVencimiento'] = data[i].documentoVencimiento;
                prof['cuit'] = data[i].cuit;
                prof['fechaNacimiento'] = moment(data[i].fechaNacimiento).format('DD/MM/YYYY');
                prof['lugarNacimiento'] = data[i].lugarNacimiento;
                prof['nacionalidad'] = data[i].nacionalidad ? data[i].nacionalidad.nombre : '';
                prof['sexo'] = data[i].sexo;
                // formacionGrado1
                prof['profesion1'] = data[i].formacionGrado && data[i].formacionGrado[0] && data[i].formacionGrado[0].profesion ? data[i].formacionGrado[0].profesion.nombre : '';
                prof['tipoDeFormacion1'] = data[i].formacionGrado && data[i].formacionGrado[0] && data[i].formacionGrado[0].profesion ? data[i].formacionGrado[0].profesion.tipoDeFormacion : '';
                prof['entidadFormadora1'] = data[i].formacionGrado && data[i].formacionGrado[0] && data[i].formacionGrado[0].entidadFormadora ? data[i].formacionGrado[0].entidadFormadora.nombre : '';
                prof['fechaEgreso1'] = data[i].formacionGrado && data[i].formacionGrado[0] ? data[i].formacionGrado[0].fechaEgreso : '';
                prof['renovacionOnline1'] = data[i].formacionGrado?.formacionGrado[0]?.renovacionOnline ? data[i].formacionGrado.formacionGrado[0].renovacionOnline.estado : '';
                if (data[i].formacionGrado && data[i].formacionGrado[0] && data[i].formacionGrado[0].matriculado && data[i].formacionGrado[0].matriculacion) {
                    const fechaUltimaMatricula = Math.max.apply(null, data[i].formacionGrado[0].matriculacion.map(matricula => matricula.inicio));
                    const ultimaMatricula = data[i].formacionGrado[0].matriculacion.find(matricula => { return matricula.inicio && matricula.inicio.getTime() === fechaUltimaMatricula; });
                    prof['matriculaGNumero1'] = ultimaMatricula ? ultimaMatricula.matriculaNumero : '';
                    prof['fechaInicio1'] = ultimaMatricula ? moment(ultimaMatricula.inicio).format('DD/MM/YYYY') : '';
                    prof['fechaFin1'] = ultimaMatricula ? moment(ultimaMatricula.fin).format('DD/MM/YYYY') : '';
                    prof['fechaBaja1'] = ultimaMatricula && ultimaMatricula.baja && ultimaMatricula.baja.fecha ? moment(ultimaMatricula.baja.fecha).format('DD/MM/YYYY') : '';
                    prof['motivoBaja1'] = ultimaMatricula && ultimaMatricula.baja ? ultimaMatricula.baja.motivo : '';
                } else {
                    prof['matriculaGNumero1'] = '';
                    prof['fechaInicio1'] = '';
                    prof['fechaFin1'] = '';
                    prof['fechaBaja1'] = '';
                    prof['motivoBaja1'] = '';
                }
                prof['fechaInscripcion1'] = data[i].formacionGrado && data[i].formacionGrado[0] ? moment(data[i].formacionGrado[0].fechaDeInscripcion).format('DD/MM/YYYY') : '';
                // formacionGrado2
                prof['profesion2'] = data[i].formacionGrado && data[i].formacionGrado[1] && data[i].formacionGrado[1].profesion ? data[i].formacionGrado[1].profesion.nombre : '';
                prof['tipoDeFormacion2'] = data[i].formacionGrado && data[i].formacionGrado[1] && data[i].formacionGrado[1].profesion ? data[i].formacionGrado[1].profesion.tipoDeFormacion : '';
                prof['entidadFormadora2'] = data[i].formacionGrado && data[i].formacionGrado[1] && data[i].formacionGrado[1].entidadFormadora ? data[i].formacionGrado[1].entidadFormadora.nombre : '';
                prof['fechaEgreso2'] = data[i].formacionGrado && data[i].formacionGrado[1] ? data[i].formacionGrado[1].fechaEgreso : '';
                prof['renovacionOnline2'] = data[i].formacionGrado?.formacionGrado[1]?.renovacionOnline ? data[i].formacionGrado.formacionGrado[1].renovacionOnline.estado : '';
                if (data[i].formacionGrado && data[i].formacionGrado[1] && data[i].formacionGrado[1].matriculado && data[i].formacionGrado[1].matriculacion) {
                    const fechaUltimaMatricula = Math.max.apply(null, data[i].formacionGrado[1].matriculacion.map(matricula => matricula.inicio));
                    const ultimaMatricula = data[i].formacionGrado[1].matriculacion.find(matricula => { return matricula.inicio && matricula.inicio.getTime() === fechaUltimaMatricula; });
                    prof['matriculaGNumero2'] = ultimaMatricula ? ultimaMatricula.matriculaNumero : '';
                    prof['fechaInicio2'] = ultimaMatricula ? moment(ultimaMatricula.inicio).format('DD/MM/YYYY') : '';
                    prof['fechaFin2'] = ultimaMatricula ? moment(ultimaMatricula.fin).format('DD/MM/YYYY') : '';
                    prof['fechaBaja2'] = ultimaMatricula && ultimaMatricula.baja && ultimaMatricula.baja.fecha ? moment(ultimaMatricula.baja.fecha).format('DD/MM/YYYY') : '';
                    prof['motivoBaja2'] = ultimaMatricula && ultimaMatricula.baja ? ultimaMatricula.baja.motivo : '';
                } else {
                    prof['matriculaGNumero2'] = '';
                    prof['fechaInicio2'] = '';
                    prof['fechaFin2'] = '';
                    prof['fechaBaja2'] = '';
                    prof['motivoBaja2'] = '';
                }
                prof['fechaInscripcion2'] = data[i].formacionGrado && data[i].formacionGrado[1] ? moment(data[i].formacionGrado[1].fechaDeInscripcion).format('DD/MM/YYYY') : '';
                // formacionGrado3
                prof['profesion3'] = data[i].formacionGrado && data[i].formacionGrado[2] && data[i].formacionGrado[2].profesion ? data[i].formacionGrado[2].profesion.nombre : '';
                prof['tipoDeFormacion3'] = data[i].formacionGrado && data[i].formacionGrado[2] && data[i].formacionGrado[2].profesion ? data[i].formacionGrado[2].profesion.tipoDeFormacion : '';
                prof['entidadFormadora3'] = data[i].formacionGrado && data[i].formacionGrado[2] && data[i].formacionGrado[2].entidadFormadora ? data[i].formacionGrado[2].entidadFormadora.nombre : '';
                prof['fechaEgreso3'] = data[i].formacionGrado && data[i].formacionGrado[2] ? data[i].formacionGrado[2].fechaEgreso : '';
                prof['renovacionOnline3'] = data[i].formacionGrado?.formacionGrado[2]?.renovacionOnline ? data[i].formacionGrado.formacionGrado[2].renovacionOnline.estado : '';
                if (data[i].formacionGrado && data[i].formacionGrado[2] && data[i].formacionGrado[2].matriculado && data[i].formacionGrado[2].matriculacion) {
                    const fechaUltimaMatricula = Math.max.apply(null, data[i].formacionGrado[2].matriculacion.map(matricula => matricula.inicio));
                    const ultimaMatricula = data[i].formacionGrado[2].matriculacion.find(matricula => { return matricula.inicio && matricula.inicio.getTime() === fechaUltimaMatricula; });
                    prof['matriculaGNumero3'] = ultimaMatricula ? ultimaMatricula.matriculaNumero : '';
                    prof['fechaInicio3'] = ultimaMatricula ? moment(ultimaMatricula.inicio).format('DD/MM/YYYY') : '';
                    prof['fechaFin3'] = ultimaMatricula ? moment(ultimaMatricula.fin).format('DD/MM/YYYY') : '';
                    prof['fechaBaja3'] = ultimaMatricula && ultimaMatricula.baja && ultimaMatricula.baja.fecha ? moment(ultimaMatricula.baja.fecha).format('DD/MM/YYYY') : '';
                    prof['motivoBaja3'] = ultimaMatricula && ultimaMatricula.baja ? ultimaMatricula.baja.motivo : '';
                } else {
                    prof['matriculaGNumero3'] = '';
                    prof['fechaInicio3'] = '';
                    prof['fechaFin3'] = '';
                    prof['fechaBaja3'] = '';
                    prof['motivoBaja3'] = '';
                }
                prof['fechaInscripcion3'] = data[i].formacionGrado && data[i].formacionGrado[2] ? moment(data[i].formacionGrado[2].fechaDeInscripcion).format('DD/MM/YYYY') : '';

                // formacionPosgrado1
                prof['especialidad1'] = data[i].formacionPosgrado && data[i].formacionPosgrado[0] ? data[i].formacionPosgrado[0].especialidad.nombre : '';
                if (data[i].formacionPosgrado && data[i].formacionPosgrado[0] && data[i].formacionPosgrado[0].matriculado && data[i].formacionPosgrado[0].matriculacion) {
                    const fechaUltimaMatricula = Math.max.apply(null, data[i].formacionPosgrado[0].matriculacion.map(matricula => matricula.inicio));
                    const ultimaMatricula = data[i].formacionPosgrado[0].matriculacion.find(matricula => { return matricula.inicio && matricula.inicio.getTime() === fechaUltimaMatricula; });
                    prof['matriculaPNumero1'] = ultimaMatricula ? ultimaMatricula.matriculaNumero : '';
                } else {
                    prof['matriculaPNumero1'] = '';
                }
                prof['tieneVencimiento1'] = data[i].formacionPosgrado && data[i].formacionPosgrado[0] ? data[i].formacionPosgrado[0].tieneVencimiento ? 'Si' : 'No' : '';
                // formacionPosgrado2
                prof['especialidad2'] = data[i].formacionPosgrado && data[i].formacionPosgrado[1] ? data[i].formacionPosgrado[1].especialidad.nombre : '';
                if (data[i].formacionPosgrado && data[i].formacionPosgrado[1] && data[i].formacionPosgrado[1].matriculado && data[i].formacionPosgrado[1].matriculacion) {
                    const fechaUltimaMatricula = Math.max.apply(null, data[i].formacionPosgrado[1].matriculacion.map(matricula => matricula.inicio));
                    const ultimaMatricula = data[i].formacionPosgrado[1].matriculacion.find(matricula => { return matricula.inicio && matricula.inicio.getTime() === fechaUltimaMatricula; });
                    prof['matriculaPNumero2'] = ultimaMatricula ? ultimaMatricula.matriculaNumero : '';
                } else {
                    prof['matriculaPNumero2'] = '';
                }
                prof['tieneVencimiento2'] = data[i].formacionPosgrado && data[i].formacionPosgrado[1] ? data[i].formacionPosgrado[1].tieneVencimiento ? 'Si' : 'No' : '';

                // formacionPosgrado3
                prof['especialidad3'] = data[i].formacionPosgrado && data[i].formacionPosgrado[2] ? data[i].formacionPosgrado[2].especialidad.nombre : '';
                if (data[i].formacionPosgrado && data[i].formacionPosgrado[2] && data[i].formacionPosgrado[2].matriculado && data[i].formacionPosgrado[2].matriculacion) {
                    const fechaUltimaMatricula = Math.max.apply(null, data[i].formacionPosgrado[2].matriculacion.map(matricula => matricula.inicio));
                    const ultimaMatricula = data[i].formacionPosgrado[2].matriculacion.find(matricula => { return matricula.inicio && matricula.inicio.getTime() === fechaUltimaMatricula; });
                    prof['matriculaPNumero3'] = ultimaMatricula ? ultimaMatricula.matriculaNumero : '';
                } else {
                    prof['matriculaPNumero3'] = '';
                }
                prof['tieneVencimiento3'] = data[i].formacionPosgrado && data[i].formacionPosgrado[2] ? data[i].formacionPosgrado[2].tieneVencimiento ? 'Si' : 'No' : '';
                // formacionPosgrado4
                prof['especialidad4'] = data[i].formacionPosgrado && data[i].formacionPosgrado[3] ? data[i].formacionPosgrado[3].especialidad.nombre : '';
                if (data[i].formacionPosgrado && data[i].formacionPosgrado[3] && data[i].formacionPosgrado[3].matriculado && data[i].formacionPosgrado[3].matriculacion) {
                    const fechaUltimaMatricula = Math.max.apply(null, data[i].formacionPosgrado[3].matriculacion.map(matricula => matricula.inicio));
                    const ultimaMatricula = data[i].formacionPosgrado[3].matriculacion.find(matricula => { return matricula.inicio && matricula.inicio.getTime() === fechaUltimaMatricula; });
                    prof['matriculaPNumero4'] = ultimaMatricula ? ultimaMatricula.matriculaNumero : '';
                } else {
                    prof['matriculaPNumero4'] = '';
                }
                prof['tieneVencimiento4'] = data[i].formacionPosgrado && data[i].formacionPosgrado[3] ? data[i].formacionPosgrado[3].tieneVencimiento ? 'Si' : 'No' : '';

                // prof['fechasDeAltas1'] = data[i].formacionPosgrado[0] ? data[i].formacionPosgrado[0].fe ? 'Si' : 'No' : '';
                // TODO: que hago con fechasDeAltas?

                const fechaUltimaSancion = data[i].sanciones ? Math.max.apply(null, data[i].sanciones.map(sancion => sancion.fecha)) : null;
                const ultimaSancion = fechaUltimaSancion ? data[i].sanciones.find(sancion => { return sancion.inicio === fechaUltimaSancion; }) : null;
                prof['sancionNumero'] = ultimaSancion ? ultimaSancion.numero : '';
                prof['sancionMotivo'] = ultimaSancion ? ultimaSancion.motivo : '';
                prof['sancionnormaLegal'] = ultimaSancion ? ultimaSancion.normaLegal : '';
                prof['sancionFecha'] = ultimaSancion ? moment(ultimaSancion.fecha).format('DD/MM/YYYY') : '';
                prof['sancionVencimiento'] = ultimaSancion ? moment(ultimaSancion.vencimiento).format('DD/MM/YYYY') : '';

                prof['domicilio1'] = data[i].domicilios && data[i].domicilios[0] ? data[i].domicilios[0].valor : '';
                prof['codPos1'] = data[i].domicilios && data[i].domicilios[0] ? data[i].domicilios[0].codigoPostal : '';
                prof['pais1'] = data[i].domicilios && data[i].domicilios[0] && data[i].domicilios[0].ubicacion && data[i].domicilios[0].ubicacion.pais ? data[i].domicilios[0].ubicacion.pais.nombre : '';
                prof['provincia1'] = data[i].domicilios && data[i].domicilios[0] && data[i].domicilios[0].ubicacion && data[i].domicilios[0].ubicacion.provincia ? data[i].domicilios[0].ubicacion.provincia.nombre : '';
                prof['provincia1'] = data[i].domicilios && data[i].domicilios[0] && data[i].domicilios[0].ubicacion && data[i].domicilios[0].ubicacion.provincia ? data[i].domicilios[0].ubicacion.provincia.nombre : '';
                prof['localidad1'] = data[i].domicilios && data[i].domicilios[0] && data[i].domicilios[0].ubicacion && data[i].domicilios[0].ubicacion.localidad ? data[i].domicilios[0].ubicacion.localidad.nombre : '';

                prof['domicilio2'] = data[i].domicilios && data[i].domicilios[1] ? data[i].domicilios[1].valor : '';
                prof['codPos2'] = data[i].domicilios && data[i].domicilios[1] ? data[i].domicilios[1].codigoPostal : '';
                prof['pais2'] = data[i].domicilios && data[i].domicilios[1] && data[i].domicilios[1].ubicacion && data[i].domicilios[1].ubicacion.pais ? data[i].domicilios[1].ubicacion.pais.nombre : '';
                prof['provincia2'] = data[i].domicilios && data[i].domicilios[1] && data[i].domicilios[1].ubicacion && data[i].domicilios[1].ubicacion.provincia ? data[i].domicilios[1].ubicacion.provincia.nombre : '';
                prof['provincia2'] = data[i].domicilios && data[i].domicilios[1] && data[i].domicilios[1].ubicacion && data[i].domicilios[1].ubicacion.provincia ? data[i].domicilios[1].ubicacion.provincia.nombre : '';
                prof['localidad2'] = data[i].domicilios && data[i].domicilios[1] && data[i].domicilios[1].ubicacion && data[i].domicilios[1].ubicacion.localidad ? data[i].domicilios[1].ubicacion.localidad.nombre : '';

                prof['domicilio3'] = data[i].domicilios && data[i].domicilios[2] ? data[i].domicilios[2].valor : '';
                prof['codPos3'] = data[i].domicilios && data[i].domicilios[2] ? data[i].domicilios[2].codigoPostal : '';
                prof['pais3'] = data[i].domicilios && data[i].domicilios[2] && data[i].domicilios[2].ubicacion && data[i].domicilios[2].ubicacion.pais ? data[i].domicilios[2].ubicacion.pais.nombre : '';
                prof['provincia3'] = data[i].domicilios && data[i].domicilios[2] && data[i].domicilios[2].ubicacion && data[i].domicilios[2].ubicacion.provincia ? data[i].domicilios[2].ubicacion.provincia.nombre : '';
                prof['provincia3'] = data[i].domicilios && data[i].domicilios[2] && data[i].domicilios[2].ubicacion && data[i].domicilios[2].ubicacion.provincia ? data[i].domicilios[2].ubicacion.provincia.nombre : '';
                prof['localidad3'] = data[i].domicilios && data[i].domicilios[2] && data[i].domicilios[2].ubicacion && data[i].domicilios[2].ubicacion.localidad ? data[i].domicilios[2].ubicacion.localidad.nombre : '';

                if (data[i].contactos) {
                    const celulares = data[i].contactos.filter(contacto => contacto.tipo === 'celular');
                    if (celulares) {
                        const minRanking = Math.min.apply(null, celulares.map(cel => cel.ranking));
                        const celular = minRanking ? celulares.find(cel => cel.ranking === minRanking) : celulares[0];
                        prof['celular'] = celular ? celular.valor : '';
                    } else {
                        prof['celular'] = '';
                    }
                    const emails = data[i].contactos.filter(contacto => contacto.tipo === 'email');
                    if (emails) {
                        const minRanking = Math.min.apply(null, emails.map(mail => mail.ranking));
                        const email = minRanking ? emails.find(mail => mail.ranking === minRanking) : emails[0];
                        prof['email'] = email ? email.valor : '';
                    } else {
                        prof['email'] = '';
                    }
                    const fijos = data[i].contactos.filter(contacto => contacto.tipo === 'fijo');
                    if (fijos) {
                        const minRanking = Math.min.apply(null, fijos.map(fij => fij.ranking));
                        const fijo = minRanking ? fijos.find(fij => fij.ranking === minRanking) : fijos[0];
                        prof['fijo'] = fijo ? fijo.valor : '';
                    } else {
                        prof['fijo'] = '';
                    }
                } else {
                    prof['celular'] = '';
                    prof['email'] = '';
                    prof['fijo'] = '';

                }

                prof['rematriculado'] = data[i].rematriculado === 1 ? 'Si' : 'No';
                prof['habilitado'] = data[i].habilitado ? 'Si' : 'No';

                profesionales.push(prof);
            }
            res.status(201).json(profesionales);
        }
    });
});


router.post('/profesionales', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'matriculaciones:profesionales:postProfesional') && !req.user.profesional) {
        return next(403);
    }
    try {
        if (req.body.profesional) {
            const newProfesional = new Profesional(req.body.profesional);
            Auth.audit(newProfesional, req);
            newProfesional.save(async (err2) => {
                if (err2) {
                    return next(err2);
                }
                EventCore.emitAsync('matriculaciones:profesionales:create', newProfesional);
                log(req, 'profesional:post', null, 'profesional:post', newProfesional, null);
                res.json(newProfesional);
            });
        }
    } catch (err) {
        return next(err);
    }
});

router.patch('/profesionales/update/:id?', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'matriculaciones:profesionales:postProfesional') && !req.user.profesional) {
        return next(403);
    }
    try {

        if (req.body.imagen) {
            const response = await saveImage(req.body.imagen);
            res.json(response);
        }
        if (req.body.firma) {
            const response = await saveFirma(req.body.firma);
            res.json(response);
        }
        if (req.body.firmaAdmin) {
            const response = await saveFirma(req.body.firmaAdmin, true);
            res.json(response);
        }
        if (req.body.documentos) {
            const profesional: any = await Profesional.findById(req.body.documentos.idProfesional);
            const documento = {
                fecha: req.body.documentos.data.fecha,
                tipo: req.body.documentos.data.tipo.label,
                archivo: req.body.documentos.data.archivo
            };
            profesional?.documentos.push(documento);
            Auth.audit(profesional, (userScheduler as any));
            await profesional.save();
            res.json(profesional);
        }

        if (req.body.domicilios || req.body.domiciliosMobile) {
            const idProfesional = req.body.domicilios?.idProfesional ? req.body.domicilios.idProfesional : req.body.domiciliosMobile.idProfesional;
            const profesional: any = await Profesional.findById(idProfesional);
            profesional.domicilios = req.body.domicilios ? req.body.domicilios : req.body.domiciliosMobile.domicilios;
            Auth.audit(profesional, (userScheduler as any));
            await profesional.save();
            res.json(profesional);
        }

    } catch (error) {
        next(error);
    }
});

router.post('/profesionales/sms', (req, res, next) => {
    const smsOptions = {
        telefono: req.body.telefono,
        mensaje: req.body.mensaje
    };

    if (sendSms(smsOptions)) {
        res.send();
    }

});

router.put('/profesionales/actualizar', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'matriculaciones:profesionales:putProfesional') && !req.user.profesional) {
        return next(403);
    }
    try {
        if (req.body.id) {
            const resultado: any = await Profesional.findById(req.body.id);
            const profesionalOriginal = resultado.toObject();
            for (const key in req.body) {
                resultado[key] = req.body[key];
            }
            Auth.audit(resultado, req);
            await resultado.save();


            EventCore.emitAsync('matriculaciones:profesionales:create', resultado);
            log(req, 'profesional:put', null, 'profesional:put', resultado, profesionalOriginal);

            res.json(resultado);
        } else {
            res.json();

        }
    } catch (err) {
        next(err);
    }

});

router.delete('/profesionales/:id/documentos/:fileId', async (req: any, res, next) => {
    const profesional: any = await Profesional.findById(req.params.id);
    const fileId: any = req.params.fileId;
    const index = profesional.documentos.findIndex(doc => doc.archivo.id === fileId);
    profesional.documentos.splice(index, 1);
    Auth.audit(profesional, (userScheduler as any));
    await profesional.save();
    res.json(profesional.documentos);
});


// El delete está correcto, tomar como modelo para la documentación
/**
 * @swagger
 * /profesional/{id}:
 *   delete:
 *     tags:
 *       - Profesional
 *     description: Eliminar una profesional
 *     summary: Eliminar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una profesional
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.delete('/profesionales/:id', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'matriculaciones:profesionales:deleteProfesional')) {
        return next(403);
    }
    Profesional.findByIdAndRemove(req.params.id, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/profesionales/:id?', Auth.authenticate(), async (req, res, next) => {
    try {
        const resultado: any = await Profesional.findById(req.params.id);
        const profesionalOriginal = resultado.toObject();
        if (resultado) {
            switch (req.body.op) {
                case 'updateNotas':
                    resultado.notas = req.body.data;
                    break;
                case 'updateSancion':
                    resultado.sansiones.push(req.body.data);
                    break;
                case 'updatePosGrado':
                    if (!resultado.formacionPosgrado) {
                        resultado.formacionPosgrado = [];
                    }
                    resultado.formacionPosgrado.push(req.body.data);
                    break;
                case 'updateGrado':
                    resultado.formacionGrado.push(req.body.data);
                    break;
                case 'updateOtrosDatos':
                    resultado.OtrosDatos = req.body.data;
                    break;
                case 'updateEstadoGrado':
                    resultado.formacionGrado = req.body.data;
                    break;
                case 'updateEstadoPosGrado':
                    resultado.formacionPosgrado = req.body.data;
                    break;
                case 'updateHabilitado':
                    resultado.habilitado = req.body.data;
                    break;
                case 'updateDocumentos':
                    const documento = {
                        fecha: req.body.data.fecha,
                        tipo: req.body.data.tipo.label,
                        archivo: req.body.data.archivo
                    };
                    resultado.documentos.push(documento);
                    break;
            }
            if (req.body.agente) {
                resultado.agenteMatriculador = req.body.agente;
            }
            if (req.body.profesionExterna) {
                resultado.profesionExterna = req.body.profesionExterna;
            }
            if (req.body.matriculaExterna) {
                resultado.matriculaExterna = req.body.matriculaExterna;
            }
            if (req.body.observaciones) {
                resultado.observaciones = req.body.observaciones;
            }
            if (req.body.foto) {
                resultado.foto = req.body.foto;
            }
            if (req.body.matricula) {

                if (req.body.firmaP) {
                    await saveFirma(req.body);
                }
                if (req.body.img) {
                    await saveImage(req.body);
                }
                await deleteFirmaFotoTemporal(req.params.id, req.body.matricula, next);

            }
        }
        for (const key in req.body) {
            resultado[key] = req.body[key];
        }
        Auth.audit(resultado, req);
        await resultado.save();
        log(req, 'profesional:patch', null, 'profesional:patch', resultado, profesionalOriginal);
        res.json(resultado);
    } catch (err) {
        next(err);
    }

});

router.get('/resumen', (req, res, next) => {
    const opciones = {};
    let query;
    if (req.query.nombre) {
        opciones['nombre'] = makePattern(req.query.nombre);
    }

    if (req.query.apellido) {
        opciones['apellido'] = makePattern(req.query.apellido);

    }
    if (req.query.documento !== '') {
        opciones['documento'] = req.query.documento;
    }
    opciones['profesionalMatriculado'] = true;
    // eslint-disable-next-line prefer-const
    query = Profesional.find(opciones);
    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        let resultado = [];
        if (data.length > 0) {
            resultado = [{
                select: '' + data[0].nombreCompleto + ' - ' + data[0].documento + '',
                idRenovacion: data[0].id,
                nombre: data[0].nombre,
                apellido: data[0].apellido,
                fechaNacimiento: data[0].fechaNacimiento,
                documento: data[0].documento,
                nacionalidad: data[0].nacionalidad,
                sexo: data[0].sexo,
                formacionGrado: data[0].formacionGrado
            }];
        }
        res.json(resultado);
    });
});

router.post('/profesionales/migrarTurnos', async (req, res, next) => {
    migrarTurnos();
});

router.post('/profesionales/matriculaCero', async (req, res, next) => {
    const ress = await matriculaCero();
    res.json(ress);

});

router.post('/profesionales/formacionCero', async (req, res, next) => {
    const ress = await formacionCero();
    res.json(ress);

});

router.post('/profesionales/validar', async (req, res, next) => {
    try {
        const { documento, sexo, fechaNacimiento } = req.body;
        if (documento && sexo && fechaNacimiento) {
            const regexSexo = (value) => new RegExp(['^', value, '$'].join(''), 'i');
            const params = {
                documento,
                sexo: regexSexo(sexo),
            };
            const profesional = await Profesional.findOne(params);
            if (profesional?.id) {
                const token = await getTemporyTokenGenerarUsuario(documento);
                return res.json({ profesional, token });
            } else {
                return next('El profesional no se encuentra registrado en Andes.');
            }
        }
        return next('No se pudo validar el profesional. Por favor revise los datos ingresados.');
    } catch (err) {
        return next(500);
    }
});

export = router;

function createResponseArray(matriculas: any[], req: any) {
    const responseArray = [];
    for (let i = 0; i < matriculas.length; i++) {
        const prof = {};
        prof['nombre'] = matriculas[i].nombre;
        prof['apellido'] = matriculas[i].apellido;
        prof['tipoDocumento'] = matriculas[i].tipoDocumento;
        prof['documento'] = matriculas[i].documento;
        prof['documentoVencimiento'] = matriculas[i].documentoVencimiento;
        prof['cuit'] = matriculas[i].cuit;
        prof['fechaNacimiento'] = moment(matriculas[i].fechaNacimiento).format('DD/MM/YYYY');
        prof['lugarNacimiento'] = matriculas[i].lugarNacimiento;
        prof['nacionalidad'] = matriculas[i].nacionalidad ? matriculas[i].nacionalidad.nombre : '';
        prof['sexo'] = matriculas[i].sexo;
        if (req.query.tipoMatricula === 'grado') {
            // formacionGrado1
            prof['profesion1'] = matriculas[i].formacionGrado && matriculas[i].formacionGrado.profesion ? matriculas[i].formacionGrado.profesion.nombre : '';
            prof['tipoDeFormacion1'] = matriculas[i].formacionGrado && matriculas[i].formacionGrado.profesion ? matriculas[i].formacionGrado.profesion.tipoDeFormacion : '';
            prof['entidadFormadora1'] = matriculas[i].formacionGrado && matriculas[i].formacionGrado.entidadFormadora ? matriculas[i].formacionGrado.entidadFormadora.nombre : '';
            prof['fechaEgreso1'] = matriculas[i].formacionGrado ? matriculas[i].formacionGrado.fechaEgreso : '';
            prof['matriculaGNumero1'] = matriculas[i].ultimaMatricula ? matriculas[i].ultimaMatricula.matriculaNumero : '';
            prof['fechaInicio1'] = matriculas[i].ultimaMatricula ? moment(matriculas[i].ultimaMatricula.inicio).format('DD/MM/YYYY') : '';
            prof['fechaFin1'] = matriculas[i].ultimaMatricula ? moment(matriculas[i].ultimaMatricula.fin).format('DD/MM/YYYY') : '';
            prof['fechaBaja1'] = matriculas[i].ultimaMatricula && matriculas[i].ultimaMatricula.baja && matriculas[i].ultimaMatricula.baja.fecha ? moment(matriculas[i].ultimaMatricula.baja.fecha).format('DD/MM/YYYY') : '';
            prof['motivoBaja1'] = matriculas[i].ultimaMatricula && matriculas[i].ultimaMatricula.baja ? matriculas[i].ultimaMatricula.baja.motivo : '';
            prof['fechaInscripcion1'] = matriculas[i].formacionGrado ? moment(matriculas[i].formacionGrado.fechaDeInscripcion).format('DD/MM/YYYY') : '';
        } else {
            // formacionPosgrado1
            prof['especialidad1'] = matriculas[i].formacionPosgrado ? matriculas[i].formacionPosgrado.especialidad.nombre : '';
            prof['matriculaPNumero1'] = matriculas[i].ultimaMatriculaPosgrado ? matriculas[i].ultimaMatriculaPosgrado.matriculaNumero : '';
            prof['tieneVencimiento1'] = matriculas[i].formacionPosgrado && matriculas[i].formacionPosgrado ? matriculas[i].formacionPosgrado.tieneVencimiento ? 'Si' : 'No' : '';
            prof['fechasDeAltas1'] = matriculas[i].formacionPosgrado ? matriculas[i].formacionPosgrado.fe ? 'Si' : 'No' : '';
        }
        const fechaUltimaSancion = matriculas[i].sanciones ? Math.max.apply(null, matriculas[i].sanciones.map(sancion => sancion.fecha)) : null;
        const ultimaSancion = fechaUltimaSancion ? matriculas[i].sanciones.find(sancion => { return sancion.inicio === fechaUltimaSancion; }) : null;
        prof['sancionNumero'] = ultimaSancion ? ultimaSancion.numero : '';
        prof['sancionMotivo'] = ultimaSancion ? ultimaSancion.motivo : '';
        prof['sancionnormaLegal'] = ultimaSancion ? ultimaSancion.normaLegal : '';
        prof['sancionFecha'] = ultimaSancion ? moment(ultimaSancion.fecha).format('DD/MM/YYYY') : '';
        prof['sancionVencimiento'] = ultimaSancion ? moment(ultimaSancion.vencimiento).format('DD/MM/YYYY') : '';
        prof['domicilio1'] = matriculas[i].domicilios && matriculas[i].domicilios[0] ? matriculas[i].domicilios[0].valor : '';
        prof['codPos1'] = matriculas[i].domicilios && matriculas[i].domicilios[0] ? matriculas[i].domicilios[0].codigoPostal : '';
        prof['pais1'] = matriculas[i].domicilios && matriculas[i].domicilios[0] && matriculas[i].domicilios[0].ubicacion && matriculas[i].domicilios[0].ubicacion.pais ? matriculas[i].domicilios[0].ubicacion.pais.nombre : '';
        prof['provincia1'] = matriculas[i].domicilios && matriculas[i].domicilios[0] && matriculas[i].domicilios[0].ubicacion && matriculas[i].domicilios[0].ubicacion.provincia ? matriculas[i].domicilios[0].ubicacion.provincia.nombre : '';
        prof['provincia1'] = matriculas[i].domicilios && matriculas[i].domicilios[0] && matriculas[i].domicilios[0].ubicacion && matriculas[i].domicilios[0].ubicacion.provincia ? matriculas[i].domicilios[0].ubicacion.provincia.nombre : '';
        prof['localidad1'] = matriculas[i].domicilios && matriculas[i].domicilios[0] && matriculas[i].domicilios[0].ubicacion && matriculas[i].domicilios[0].ubicacion.localidad ? matriculas[i].domicilios[0].ubicacion.localidad.nombre : '';
        prof['domicilio2'] = matriculas[i].domicilios && matriculas[i].domicilios[1] ? matriculas[i].domicilios[1].valor : '';
        prof['codPos2'] = matriculas[i].domicilios && matriculas[i].domicilios[1] ? matriculas[i].domicilios[1].codigoPostal : '';
        prof['pais2'] = matriculas[i].domicilios && matriculas[i].domicilios[1] && matriculas[i].domicilios[1].ubicacion && matriculas[i].domicilios[1].ubicacion.pais ? matriculas[i].domicilios[1].ubicacion.pais.nombre : '';
        prof['provincia2'] = matriculas[i].domicilios && matriculas[i].domicilios[1] && matriculas[i].domicilios[1].ubicacion && matriculas[i].domicilios[1].ubicacion.provincia ? matriculas[i].domicilios[1].ubicacion.provincia.nombre : '';
        prof['provincia2'] = matriculas[i].domicilios && matriculas[i].domicilios[1] && matriculas[i].domicilios[1].ubicacion && matriculas[i].domicilios[1].ubicacion.provincia ? matriculas[i].domicilios[1].ubicacion.provincia.nombre : '';
        prof['localidad2'] = matriculas[i].domicilios && matriculas[i].domicilios[1] && matriculas[i].domicilios[1].ubicacion && matriculas[i].domicilios[1].ubicacion.localidad ? matriculas[i].domicilios[1].ubicacion.localidad.nombre : '';
        prof['domicilio3'] = matriculas[i].domicilios && matriculas[i].domicilios[2] ? matriculas[i].domicilios[2].valor : '';
        prof['codPos3'] = matriculas[i].domicilios && matriculas[i].domicilios[2] ? matriculas[i].domicilios[2].codigoPostal : '';
        prof['pais3'] = matriculas[i].domicilios && matriculas[i].domicilios[2] && matriculas[i].domicilios[2].ubicacion && matriculas[i].domicilios[2].ubicacion.pais ? matriculas[i].domicilios[2].ubicacion.pais.nombre : '';
        prof['provincia3'] = matriculas[i].domicilios && matriculas[i].domicilios[2] && matriculas[i].domicilios[2].ubicacion && matriculas[i].domicilios[2].ubicacion.provincia ? matriculas[i].domicilios[2].ubicacion.provincia.nombre : '';
        prof['provincia3'] = matriculas[i].domicilios && matriculas[i].domicilios[2] && matriculas[i].domicilios[2].ubicacion && matriculas[i].domicilios[2].ubicacion.provincia ? matriculas[i].domicilios[2].ubicacion.provincia.nombre : '';
        prof['localidad3'] = matriculas[i].domicilios && matriculas[i].domicilios[2] && matriculas[i].domicilios[2].ubicacion && matriculas[i].domicilios[2].ubicacion.localidad ? matriculas[i].domicilios[2].ubicacion.localidad.nombre : '';
        if (matriculas[i].contactos) {
            const celulares = matriculas[i].contactos.filter(contacto => contacto.tipo === 'celular');
            if (celulares) {
                const minRanking = Math.min.apply(null, celulares.map(cel => cel.ranking));
                const celular = minRanking ? celulares.find(cel => cel.ranking === minRanking) : celulares[0];
                prof['celular'] = celular ? celular.valor : '';
            } else {
                prof['celular'] = '';
            }
            const emails = matriculas[i].contactos.filter(contacto => contacto.tipo === 'email');
            if (emails) {
                const minRanking = Math.min.apply(null, emails.map(mail => mail.ranking));
                const email = minRanking ? emails.find(mail => mail.ranking === minRanking) : emails[0];
                prof['email'] = email ? email.valor : '';
            } else {
                prof['email'] = '';
            }
            const fijos = matriculas[i].contactos.filter(contacto => contacto.tipo === 'fijo');
            if (fijos) {
                const minRanking = Math.min.apply(null, fijos.map(fij => fij.ranking));
                const fijo = minRanking ? fijos.find(fij => fij.ranking === minRanking) : fijos[0];
                prof['fijo'] = fijo ? fijo.valor : '';
            } else {
                prof['fijo'] = '';
            }
        } else {
            prof['celular'] = '';
            prof['email'] = '';
            prof['fijo'] = '';
        }
        prof['rematriculado'] = matriculas[i].rematriculado === 1 ? 'Si' : 'No';
        prof['habilitado'] = matriculas[i].habilitado ? 'Si' : 'No';
        responseArray.push(prof);
    }
    return responseArray;
}
