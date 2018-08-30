import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import { model as Prestacion } from '../../rup/schemas/prestacion';
import * as Paciente from '../../../core/mpi/controller/paciente';
import { model as Org } from '../../../core/tm/schemas/organizacion';
import * as snomed from '../../../core/term/controller/snomedCtr';
import * as conceptoTurneable from '../../../core/tm/schemas/tipoPrestacion';
import * as path from 'path';
import { env } from 'process';

moment.locale('es');

// Muestra mensaje y línea de un error dentro de una promise ;-)
if (env.NODE_ENV !== 'production') {
    // tslint:disable-next-line:no-console
    process.on('unhandledRejection', r => console.log(r));
}

export class Documento {

    // private static locale = 'es-ES';
    public static timeZone = 'America/Argentina/Buenos_Aires';

    /**
     * Opciones default de PDF rendering
     */
    private static options: pdf.CreateOptions = {};

    /**
     *
     * @param idPrestacion string ObjectID válido
     */
    private static getPrestacionData(idPrestacion) {
        return new Promise((resolve, reject) => {
            Prestacion.findById(idPrestacion, (err, prestacion: any) => {
                if (err) {
                    reject(err);
                }
                resolve(prestacion);
            });

        });
    }

    /**
     *
     * @param sctid string Snomed concept ID
     */
    private static getPrestacionInformeParams(sctid) {
        return new Promise((resolve, reject) => {
            conceptoTurneable.tipoPrestacion.findOne({ conceptId: sctid }, (err, ct: any) => {
                if (err) {
                    reject(err);
                }
                resolve(ct);
            });
        });
    }

    private static async getOrgById(idOrg) {
        return new Promise((resolve, reject) => {
            Org.findById(idOrg, (err, org: any) => {
                if (err) {
                    reject(err);
                }
                resolve(org);
            });
        });
    }

    private static registroHTML(term: string, valor: any) {
        valor = !valor.evolucion ? valor : valor.evolucion;
        return `
            <article class="contenedor-concepto-data">
                <h3><!--term--></h3>
                <hr class="sm"></hr>
                <p><!--valor--></p>
            </article>`.replace(/(<!--term-->)/, term).replace(/(<!--valor-->)/, valor);
    }

    /**
     *
     * @param st string semanticTag
     */
    private static existeSemanticTagMPC(st) {
        return st === 'procedimiento' || st === 'hallazgo' || st === 'trastorno';
    }


    private static esHallazgo(st) {
        return st === 'hallazgo' || st === 'situacion' || st === 'trastorno';
    }

    private static esProcedimiento(st) {
        return (st === 'procedimiento' || st === 'entidad observable' || st === 'régimen/tratamiento' || st === 'elemento de registro');
    }

    // 'plan'
    static generarRegistroPlanHTML(plan: any, template: string): any {
        return template
            .replace('<!--plan-->', plan.concepto.term)
            .replace('<!--motivo-->', plan.valor.solicitudPrestacion.motivo)
            .replace('<!--indicaciones-->', plan.valor.solicitudPrestacion.indicaciones)
            .replace('<!--organizacionDestino-->', (plan.valor.solicitudPrestacion.organizacionDestino ? plan.valor.solicitudPrestacion.organizacionDestino.nombre : ''))
            .replace('<!--profesionalesDestino-->', plan.valor.solicitudPrestacion.profesionalesDestino.map(y => y.nombreCompleto).join(' '));

    }

    // 'procedimiento' || 'entidad observable' || 'régimen/tratamiento' || 'elemento de registro'
    static generarRegistroProcedimientoHTML(proc: any, template: string): any {
        return template
            .replace('<!--concepto-->', proc.concepto.term)
            .replace('<!--valor-->', proc.valor)
            .replace('<!--motivoPrincipalDeConsulta-->', proc.esDiagnosticoPrincipal === true ? 'Motivo principal de consulta' : '');

    }

    // 'procedimiento' || 'hallazgo' || 'trastorno'
    static generarRegistroHallazgoHTML(hallazgo: any, template: string): any {
        return template
            .replace('<!--concepto-->', hallazgo.concepto.term)
            .replace('<!--evolucion-->', hallazgo.valor.evolucion)
            .replace('<!--motivoPrincipalDeConsulta-->', hallazgo.esDiagnosticoPrincipal === true ? 'Motivo principal de consulta' : '');

    }

    private static async generarHTML(req) {

        // Prestación
        let prestacion: any = await this.getPrestacionData(req.body.idPrestacion);

        // Títulos default
        let tituloFechaEjecucion = 'Fecha Ejecución';

        // Configuraciones de informe propios de la prestación
        let config: any = await this.getPrestacionInformeParams(prestacion.solicitud.tipoPrestacion.conceptId);

        // Se crea un objecto nuevo
        config = JSON.parse(JSON.stringify(config));

        // Paciente
        let paciente: any = await Paciente.buscarPaciente(prestacion.paciente.id);
        paciente = paciente.paciente; // SI, YA SÉ

        if (paciente.id) {

            let tipoPrestacion;
            let tituloInforme;

            if (config.informe) {
                // Override título "Fecha Ejecución"?
                tituloFechaEjecucion = config.informe.fechaEjecucionOverride ? config.informe.fechaEjecucionOverride : 'Fecha Ejecución';
            }

            // Vemos si el tipo de prestación tiene registros que son hijos directos (TP: Ecografía; Hijo: Ecografía obstétrica)
            let hijos = await snomed.getChildren(prestacion.solicitud.tipoPrestacion.conceptId, { all: true });
            let motivoPrincipalDeConsulta;
            let tituloRegistro;
            let contenidoInforme;

            // Override título del primer registro?
            if (config.informe && config.informe.tipoPrestacionTituloOverride) {
                tituloRegistro = hijos.find(x => prestacion.ejecucion.registros.find(y => y.concepto.conceptId === x.conceptId));

                tituloInforme = config.informe.registroTituloOverride;
                tipoPrestacion = prestacion.ejecucion.registros[0].nombre;
                prestacion.ejecucion.registros[0].concepto.term = tituloInforme;
                tituloInforme = tituloInforme[0].toUpperCase() + tituloInforme.slice(1);
                contenidoInforme = prestacion.ejecucion.registros.find(x => this.registroHTML(x.concepto.term, x.valor)).valor;
                contenidoInforme = contenidoInforme.evolucion ? contenidoInforme.evolucion : contenidoInforme;

            } else {
                // Si tiene un hijo directo, usamos su nombre como título de la consulta
                tipoPrestacion = prestacion.solicitud.tipoPrestacion.term[0].toUpperCase() + prestacion.solicitud.tipoPrestacion.term.slice(1);
            }

            tipoPrestacion = tipoPrestacion[0].toUpperCase() + tipoPrestacion.slice(1);


            // Existe configuración de Motivo Principal de Consulta?
            if (config.informe && config.informe.motivoPrincipalDeConsultaOverride) {
                if (prestacion.ejecucion.registros.length > 1) {
                    let existeConcepto = prestacion.ejecucion.registros.find(x => this.existeSemanticTagMPC(x.concepto.semanticTag) && x.esDiagnosticoPrincipal);


                    if (existeConcepto.esDiagnosticoPrincipal && tituloRegistro && tituloRegistro.conceptId !== existeConcepto.concepto.conceptId) {
                        motivoPrincipalDeConsulta = existeConcepto;
                        if (motivoPrincipalDeConsulta) {
                            motivoPrincipalDeConsulta = '<b>Motivo Principal de consulta: </b>' + motivoPrincipalDeConsulta.concepto.term;
                        }
                    }
                }
            }


            let registros = '';
            if (!config.informe) {

                let hallazgos, procedimientos, planes = [];

                hallazgos = prestacion.ejecucion.registros.filter(x => this.esHallazgo(x.concepto.semanticTag));
                procedimientos = prestacion.ejecucion.registros.filter(x => this.esProcedimiento(x.concepto.semanticTag));
                planes = prestacion.ejecucion.registros.filter(x => x.esSolicitud === true);

                let hallazgoTemplate = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/hallazgo.html'), 'utf8');
                hallazgos = hallazgos.length > 0 ? hallazgos.map(x => {
                    if (this.esHallazgo(x.concepto.semanticTag)) {
                        return this.generarRegistroHallazgoHTML(x, hallazgoTemplate);
                    }
                }) : [];

                let procedimientoTemplate = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/procedimiento.html'), 'utf8');
                procedimientos = procedimientos.length > 0 ? procedimientos.map(x => {
                    if (this.esProcedimiento(x.concepto.semanticTag) && x.esSolicitud === false) {
                        return this.generarRegistroProcedimientoHTML(x, procedimientoTemplate);
                    }
                }) : [];

                let planTemplate = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/plan.html'), 'utf8');
                planes = planes.length > 0 ? planes.map(x => {
                    if (x.esSolicitud) {
                        return this.generarRegistroPlanHTML(x, planTemplate);
                    }
                }) : [];


                registros = [...hallazgos, ...procedimientos, ...planes].join('');
            }

            // Se leen header y footer (si se le pasa un encoding, devuelve un string)
            let html = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/informe.html'), 'utf8');

            // let header = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/header.html'), 'utf8');

            let nombreCompleto = paciente.apellido + ', ' + paciente.nombre;
            let fechaNacimiento = paciente.fechaNacimiento;
            let datosRapidosPaciente = paciente.sexo + ' | ' + moment(fechaNacimiento).fromNow(true) + ' | ' + paciente.documento;

            let idOrg = (Auth.getOrganization(req, 'id') as any);
            let organizacion: any = await this.getOrgById(idOrg);

            let carpeta = paciente.carpetaEfectores.find(x => x.organizacion.id === idOrg);

            let profesionalSolicitud = prestacion.solicitud.profesional.apellido + ', ' + prestacion.solicitud.profesional.nombre;
            let profesionalValidacion = prestacion.updatedBy ? prestacion.updatedBy.nombreCompleto : prestacion.createdBy.nombreCompleto;

            let orgacionacionDireccionSolicitud = organizacion.direccion.valor + ', ' + organizacion.direccion.ubicacion.localidad.nombre;

            // HEADER
            html = html
                .replace('<!--paciente-->', nombreCompleto)
                .replace('<!--datosRapidosPaciente-->', datosRapidosPaciente)
                .replace('<!--fechaNacimiento-->', moment(fechaNacimiento).format('DD/MM/YYYY'))
                .replace('<!--nroCarpeta-->', (carpeta && carpeta.nroCarpeta ? carpeta.nroCarpeta : 'sin número de carpeta'))
                .replace(/(<!--organizacionNombreSolicitud-->)/g, prestacion.solicitud.organizacion.nombre.replace(' - ', '<br>'))
                .replace('<!--orgacionacionDireccionSolicitud-->', orgacionacionDireccionSolicitud)
                .replace('<!--fechaSolicitud-->', moment(prestacion.solicitud.fecha).format('DD/MM/YYYY'))
                .replace('<!--profesionalSolicitud-->', profesionalSolicitud);

            let fechaEjecucion = new Date(prestacion.estados.find(x => x.tipo === 'ejecucion').createdAt);
            let fechaValidacion = new Date(prestacion.estados.find(x => x.tipo === 'validada').createdAt);

            // BODY
            html = html
                .replace('<!--tipoPrestacion-->', tipoPrestacion)
                .replace('<!--fechaSolicitud-->', moment(prestacion.solicitud.fecha).format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--tituloFechaEjecucion-->', tituloFechaEjecucion)
                .replace('<!--fechaEjecucion-->', moment(fechaEjecucion).format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--fechaValidacion-->', moment(fechaValidacion).format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--tituloInforme-->', tituloInforme ? tituloInforme : '')
                .replace('<!--contenidoInforme-->', contenidoInforme ? contenidoInforme : '')
                .replace('<!--registros-->', registros.length ? registros : '');

            // FOOTER
            html = html
                .replace('<!--profesionalFirmante1-->', profesionalSolicitud)
                .replace('<!--usuario-->', Auth.getUserName(req))
                .replace(/(<!--fechaActual-->)/g, moment().format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--profesionalValidacion-->', profesionalValidacion)
                .replace('<!--fechaValidacion-->', moment(fechaValidacion).format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--organizacionNombreSolicitud-->', prestacion.solicitud.organizacion.nombre)
                .replace('<!--orgacionacionDireccionSolicitud-->', organizacion.direccion.valor + ', ' + organizacion.direccion.ubicacion.localidad.nombre)
                .replace('<!--fechaSolicitud-->', moment(prestacion.solicitud.fecha).format('DD/MM/YYYY'));

            if (config.informe && motivoPrincipalDeConsulta) {
                html = html
                    .replace('<!--motivoPrincipalDeConsulta-->', motivoPrincipalDeConsulta);

            }

            // Se carga logo del efector, si no existe se muestra el nombre del efector como texto
            let nombreLogo = prestacion.solicitud.organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');
            try {
                let logoEfector;
                logoEfector = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/efectores/' + nombreLogo + '.png'));
                html = html
                    .replace('<!--logoOrganizacion-->', `<img class="logo-efector" src="data:image/png;base64,${logoEfector.toString('base64')}">`);
            } catch (fileError) {
                html = html
                    .replace('<!--logoOrganizacion-->', `<b class="no-logo-efector">${prestacion.solicitud.organizacion.nombre}</b>`);
            }

            // Logos comunes a todos los informes
            let logoAdicional = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-adicional.png'));
            let logoAndes = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-andes-h.png'));
            let logoPDP = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-pdp.png'));
            let logoPDP2 = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-pdp-h.png'));

            // Firmas
            html = html
                .replace('<!--logoAdicional-->', `<img class="logo-adicional" src="data:image/png;base64,${logoAdicional.toString('base64')}">`)
                .replace('<!--logoAndes-->', `<img class="logo-andes" src="data:image/png;base64,${logoAndes.toString('base64')}">`)
                .replace('<!--logoPDP-->', `<img class="logo-pdp" src="data:image/png;base64,${logoPDP.toString('base64')}">`)
                .replace('<!--logoPDP2-->', `<img class="logo-pdp-h" src="data:image/png;base64,${logoPDP2.toString('base64')}">`);

            return html;
        } else {
            return false;
        }
    }

    private static generarCSS() {
        // Se agregan los estilos CSS
        let scssFile = path.join(__dirname, '../../../templates/rup/informes/sass/main.scss');

        // Se agregan los estilos
        let css = '<style>\n\n';

        // SCSS => CSS
        css += scss.renderSync({
            file: scssFile
        }).css;
        css += '</style>';
        return css;
    }

    /**
     *
     * @param req ExpressJS request
     * @param res ExpressJS response
     * @param next ExpressJS next
     * @param options html-pdf/PhantonJS rendering options
     */
    static descargar(req, res, next, options = null) {

        return new Promise((resolve, reject) => {

            // let html = '';
            switch (req.params.tipo) {
                case 'pdf':
                    // PhantomJS PDF rendering options
                    // https://www.npmjs.com/package/html-pdf
                    // http://phantomjs.org/api/webpage/property/paper-size.html
                    let phantomPDFOptions: pdf.CreateOptions = {
                        format: 'A4',
                        border: {
                            // default is 0, units: mm, cm, in, px
                            top: '.25cm',
                            right: '0cm',
                            bottom: '3cm',
                            left: '0cm'
                        },
                        header: {
                            height: '5.75cm',
                        },
                        footer: {
                            height: '1cm',
                            contents: {}
                        }
                    };

                    this.options = options || phantomPDFOptions;

                    this.generarHTML(req).then(htmlPDF => {
                        htmlPDF = htmlPDF + this.generarCSS();
                        pdf.create(htmlPDF, this.options).toFile((err2, file): any => {

                            if (err2) {
                                reject(err2);
                            }

                            resolve(file.filename);

                        });
                    });
                    break;

            }

        });
    }

}
