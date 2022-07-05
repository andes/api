import { apiOptionsMiddleware } from '@andes/api-tool';
import { AndesDrive } from '@andes/drive';
import { initialize as FHIRInitialize } from '@andes/fhir';
import * as bodyParser from 'body-parser';
import { Express, Router } from 'express';
import * as boolParser from 'express-query-boolean';
import * as HttpStatus from 'http-status-codes';
import { Auth } from './auth/auth.class';
import * as config from './config';
import * as configPrivate from './config.private';
import { Swagger } from './swagger/swagger.class';

const proxy = require('express-http-proxy');
const requireDir = require('require-dir');

export function initAPI(app: Express) {

    FHIRInitialize({ dominio: configPrivate.FHIR.domain });


    // Inicializa Mongoose
    const { Connections } = require('./connections');
    Connections.initialize();

    // Inicializa la autenticación con Passport/JWT
    Auth.initialize(app);

    // Handlebars: Registramos template de password recovery
    const { registerPartialTemplate } = require('./utils/roboSender/sendEmail');
    registerPartialTemplate('layout', 'emails/layout.html');

    // Configura Express
    app.use(bodyParser.json({ limit: '150mb' }));
    app.use(boolParser());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(apiOptionsMiddleware);

    app.all('*', (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        // Permitir que el método OPTIONS funcione sin autenticación
        if ('OPTIONS' === req.method) {
            res.header('Access-Control-Max-Age', '1728000');
            res.sendStatus(200);
        } else {
            next();
        }
    });

    // Inicializa Swagger
    Swagger.initialize(app);

    const { setupServices } = require('./services');
    setupServices(app);

    // Carga los módulos y rutas
    for (const m in config.modules) {
        if (config.modules[m].active) {
            const routes = requireDir(config.modules[m].path);
            for (const route in routes) {
                if (config.modules[m].middleware) {
                    app.use('/api' + config.modules[m].route, config.modules[m].middleware, routes[route]);
                } else {
                    app.use('/api' + config.modules[m].route, routes[route]);
                }
            }
        }
    }

    require('./modules/pacs');

    const modulos = [
        './modules/rup',
        './modules/huds/export-huds'
    ];

    // ,

    modulos.forEach((moduloPath) => {
        const m = require(moduloPath);
        m.setup(app);
    });

    const TMRouter = require('./core/tm').Routes;
    const MPI = require('./core-v2/mpi');
    const NomivacRouter = require('./modules/vacunas').Routes;

    // const MPI = require('@andes/mpi');
    TMRouter.forEach(router => {
        app.use('/api/core/tm', router);
    });

    NomivacRouter.forEach(router => {
        app.use('/api/modules/vacunas', router);
    });

    app.use('/api/modules/forms', require('./modules/forms').FormRouter);
    app.use('/api/modules/forms/form-resources', require('./modules/forms').FormResourcesRouter);
    app.use('/api/modules/forms/form-resources', require('./modules/forms').FormPresetResourcesRouter);
    app.use('/api/modules/gestor-usuarios', require('./modules/gestor-usuarios').UsuariosRouter);
    app.use('/api/modules/gestor-usuarios', require('./modules/gestor-usuarios').PerfilesRouter);
    app.use('/api/modules/registro-novedades', require('./modules/registro-novedades').NovedadesRouter);
    app.use('/api/modules/huds', require('./modules/huds').HudsAccesoRouter);
    app.use('/api/modules/webhook', require('./modules/webhook').WebhookRouter);
    app.use('/api/modules/webhook', require('./modules/webhook/webhooklog').WebhookLogRouter);
    app.use('/api/modules/seguimiento-paciente', require('./modules/seguimiento-paciente').SeguimientoPacienteRouter);
    app.use('/api/modules/com', require('./modules/centroOperativoMedico').DerivacionesRouter);
    app.use('/api/modules/com', require('./modules/centroOperativoMedico').TipoTrasladoRouter);
    app.use('/api/modules/com', require('./modules/centroOperativoMedico').ReglasDerivacionRouter);
    app.use('/api/modules/perinatal', require('./modules/perinatal').CarnetPerinatalRouter);
    app.use('/api/core-v2/mpi', MPI.RoutingMPI);
    app.use('/api/modules/forms/forms-epidemiologia', require('./modules/forms/').FormEpidemiologiaRouter);
    app.use('/api/modules/forms/forms-epidemiologia', require('./modules/forms/').FormHistoryRouter);
    app.use('/api/modules', require('./modules/dispositivo/').DispositivoRouter);
    app.use('/api/modules', require('./modules/semaforo/').SemaforoRouter);
    app.use('/api/modules', require('./modules/constantes').ConstantesRouter);

    if (configPrivate.hosts.BI_QUERY) {
        app.use(
            '/api/bi',
            Auth.authenticate(),
            proxy(configPrivate.hosts.BI_QUERY)
        );
    }
    app.use('/api/modules/turnos', require('./modules/turnos').InstitucionRouter);

    const { PacienteAppRouter, SendMessageCacheRouter } = require('./modules/mobileApp');
    app.use('/api/modules/mobileApp', SendMessageCacheRouter);
    app.use('/api/modules/mobileApp', PacienteAppRouter);
    app.use('/api/modules', require('./modules/personalSalud').PersonalSaludRouter);
    app.use('/api/modules/turnos', require('./modules/turnos/condicionPaciente').CondicionPacienteRouter);

    /**
     * Inicializa las rutas para adjuntar archivos
     */
    if (configPrivate.Drive) {
        AndesDrive.setup(configPrivate.Drive);
        const router = Router();
        router.use(Auth.authenticate());
        AndesDrive.install(router);
        app.use('/api/drive', router);
    }

    // Error handler
    app.use((err: any, req, res, next) => {
        if (err) {
            // Parse err
            let e: Error;
            if (!isNaN(err)) {
                e = new Error(HttpStatus.getStatusText(err));
                (e as any).status = err;
                err = e;
            } else {
                if (typeof err === 'string') {
                    e = new Error(err);
                    (e as any).status = 400;
                    err = e;
                } else if (!err.status) {
                    err.status = 500;
                }
            }

            // IMPORTANTE: Express app.get('env') returns 'development' if NODE_ENV is not defined.
            // O sea, la API está corriendo siempre en modo development

            // Send response
            res.status(err.status);
            res.send({
                message: err.message,
                error: (app.get('env') === 'development') ? err : null
            });
        }
    });


}
