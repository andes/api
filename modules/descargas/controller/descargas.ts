import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import { model as Prestacion } from '../../rup/schemas/prestacion';
import * as Paciente from '../../../core/mpi/controller/paciente';
import { model as Org } from '../../../core/tm/schemas/organizacion';
import * as snomed from '../../../core/term/controller/snomedCtr';
import * as rup from '../../../modules/rup/schemas/elementoRUP';
import * as conceptoTurneable from '../../../core/tm/schemas/tipoPrestacion';
import * as path from 'path';
import { env } from 'process';

moment.locale('es');

// Muestra mensaje y línea de un error dentro de una promise ;-)
if (env.NODE_ENV !== 'production') {
    // tslint:disable-next-line:no-console
    process.on('unhandledRejection', r => console.log(r));
    // tslint:disable-next-line:no-console
    process.on('TypeError', r => console.log(r));
}

export class Documento {

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
                    reject(false);
                }
                resolve(ct);
            });
        });
    }

    /**
     *
     * @param sctid string Snomed concept ID
     */
    private static getPrestacionInformeComponent(sctid) {
        return new Promise((resolve, reject) => {
            rup.elementoRUP.findOne({ 'conceptos.conceptId': sctid }, (err, ct: any) => {
                if (err) {
                    reject(false);
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

    /**
     *
     * @param st string semanticTag
     */
    private static existeSemanticTagMPC(st) {
        return st === 'entidad observable' || st === 'regimen/tratamiento' || st === 'procedimiento' || st === 'hallazgo' || st === 'trastorno';
    }

    private static esHallazgo(st) {
        return st === 'hallazgo' || st === 'situacion' || st === 'trastorno';
    }

    private static esProcedimiento(st) {
        return (st === 'procedimiento' || st === 'entidad observable' || st === 'régimen/tratamiento' || st === 'elemento de registro');
    }

    private static esSolicitud(st, esSolicitud) {
        return (st === 'procedimiento' || st === 'entidad observable' || st === 'régimen/tratamiento' || st === 'elemento de registro')
            && esSolicitud;
    }

    private static esInsumo(st) {
        return (st === 'producto');
    }

    // private static getRegistros(registro) {
    //     return registro.valor === null ? registro.registros.filter()
    // }

    // 'plan'
    static generarRegistroSolicitudHTML(plan: any, template: string): any {
        return template
            .replace('<!--plan-->', this.ucaseFirst(plan.concepto.term))
            .replace('<!--motivo-->', plan.valor.solicitudPrestacion.motivo)
            .replace('<!--indicaciones-->', plan.valor.solicitudPrestacion.indicaciones)
            .replace('<!--organizacionDestino-->', (plan.valor.solicitudPrestacion.organizacionDestino ? plan.valor.solicitudPrestacion.organizacionDestino.nombre : ''))
            .replace('<!--profesionalesDestino-->', plan.valor.solicitudPrestacion.profesionalesDestino.map(y => y.nombreCompleto).join(' '));

    }

    // 'procedimiento' || 'entidad observable' || 'régimen/tratamiento' || 'elemento de registro'
    static generarRegistroProcedimientoHTML(proc: any, template: string): any {
        return template
            .replace('<!--concepto-->', this.ucaseFirst(proc.concepto.term))
            .replace('<!--valor-->', proc.valor)
            // .replace('<!--valor-->', (proc.valor || this.getRegistros(proc)))
            .replace('<!--motivoPrincipalDeConsulta-->', proc.esDiagnosticoPrincipal === true ? 'PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL' : '');

    }

    // 'procedimiento' || 'hallazgo' || 'trastorno'
    static generarRegistroHallazgoHTML(hallazgo: any, template: string): any {
        return template
            .replace('<!--concepto-->', this.ucaseFirst(hallazgo.concepto.term))
            .replace('<!--evolucion-->', hallazgo.valor.evolucion ? hallazgo.valor.evolucion : 'sin valor')
            .replace('<!--motivoPrincipalDeConsulta-->', hallazgo.esDiagnosticoPrincipal === true ? 'PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL' : '');

    }

    // 'producto'
    static generarRegistroInsumoHTML(producto: any, template: string): any {
        return template
            .replace('<!--concepto-->', this.ucaseFirst(producto.concepto.term))
            .replace('<!--motivoPrincipalDeConsulta-->', producto.esDiagnosticoPrincipal === true ? 'PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL' : '')
            .replace('<!--recetable-->', producto.valor.recetable ? '(recetable)' : '(no recetable)')
            .replace('<!--estado-->', producto.valor.estado)
            .replace('<!--cantidad-->', producto.valor.cantidad)
            .replace('<!--unidad-->', producto.valor.unidad)
            .replace('<!--cantidadDuracion-->', producto.valor.duracion.cantidad)
            .replace('<!--unidadDuracion-->', producto.valor.duracion.unidad)
            .replace('<!--indicacion-->', producto.valor.indicacion);
    }

    static crearProcedimientos(proc, template) {
        return proc.length > 0 ? proc.map(x => {
            if (this.esProcedimiento(x.concepto.semanticTag) && x.esSolicitud === false) {
                if (x.valor !== null && x.registros.length === 0) {
                    return this.generarRegistroProcedimientoHTML(x, template);
                } else {

                }
            }
        }) : [];
    }

    static crearHallazgos(hall, template) {
        return hall.length > 0 ? hall.map(x => {
            if (this.esHallazgo(x.concepto.semanticTag)) {
                return this.generarRegistroHallazgoHTML(x, template);
            }
        }) : [];
    }

    static crearPlanes(plan, template) {
        return plan.length > 0 ? plan.map(x => {
            if (x.esSolicitud) {
                return this.generarRegistroSolicitudHTML(x, template);
            }
        }) : [];
    }

    static generarRegistro(registro, template) {
        if (this.esHallazgo(registro.concepto.semanticTag)) {
            this.generarRegistroHallazgoHTML(registro, template);
        } else if (this.esProcedimiento(registro.concepto.semanticTag)) {
            this.generarRegistroProcedimientoHTML(registro, template);
        } else if (this.esInsumo(registro.concepto.semanticTag)) {
            this.generarRegistroInsumoHTML(registro, template);
        }
    }

    static ucaseFirst(titulo: string) {
        return titulo[0].toLocaleUpperCase() + titulo.slice(1).toLocaleLowerCase();
    }

    static informeRegistros: any[] = [];
    static hallazgoTemplate = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/hallazgo.html'), 'utf8');
    static procedimientoTemplate = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/procedimiento.html'), 'utf8');
    static planTemplate = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/solicitud.html'), 'utf8');
    static insumoTemplate = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/insumo.html'), 'utf8');
    static nivelPadre = 0;

    static async generarInforme(registros, titulos?) {
        for (let i = 0; i < registros.length; i++) {
            if (registros[i]) {
                this.nivelPadre = (registros[i].registros.length > 0) ? 1 : 2;
                if (registros[i].valor) {
                    if (registros[i].valor.descripcion) {
                        this.informeRegistros = [...this.informeRegistros, ({ concepto: { term: registros[i].nombre, semanticTag: registros[i].concepto.semanticTag }, valor: `<div class="nivel-${this.nivelPadre}"><h3>${this.ucaseFirst(registros[i].nombre)}</h3><p>${this.ucaseFirst(registros[i].valor.descripcion)}</p></div>` })];
                    } else if (registros[i].valor !== null) {
                        if (this.esHallazgo(registros[i].concepto.semanticTag)) {
                            this.informeRegistros = [...this.informeRegistros, ({ concepto: { term: registros[i].concepto.term, semanticTag: registros[i].concepto.semanticTag }, valor: `<div class="nivel-${this.nivelPadre}">${this.generarRegistroHallazgoHTML(registros[i], this.hallazgoTemplate)}</div>` })];
                        } else if (this.esSolicitud(registros[i].concepto.semanticTag, registros[i].esSolicitud)) {
                            this.informeRegistros = [...this.informeRegistros, ({ concepto: { term: registros[i].concepto.term, semanticTag: registros[i].concepto.semanticTag }, valor: `<div class="nivel-${this.nivelPadre}">${this.generarRegistroSolicitudHTML(registros[i], this.hallazgoTemplate)}</div>` })];
                        } else if (this.esProcedimiento(registros[i].concepto.semanticTag)) {
                            this.informeRegistros = [...this.informeRegistros, ({ concepto: { term: registros[i].concepto.term, semanticTag: registros[i].concepto.semanticTag }, valor: `<div class="nivel-${this.nivelPadre}">${this.generarRegistroProcedimientoHTML(registros[i], this.procedimientoTemplate)}</div>` })];
                        } else if (this.esInsumo(registros[i].concepto.semanticTag)) {
                            this.informeRegistros = [...this.informeRegistros, ({ concepto: { term: registros[i].concepto.term, semanticTag: registros[i].concepto.semanticTag }, valor: `<div class="nivel-${this.nivelPadre}">${this.generarRegistroInsumoHTML(registros[i], this.insumoTemplate)}</div>` })];
                        } else {
                            if (typeof registros[i].valor !== 'string') {
                                registros[i].valor = registros[i].valor.evolucion ? registros[i].valor.evolucion : (registros[i].valor.estado ? registros[i].valor.estado : 'sin datos');
                            }
                            this.informeRegistros = [...this.informeRegistros, ({ concepto: { term: registros[i].nombre, semanticTag: registros[i].concepto.semanticTag }, valor: `<div class="nivel-${this.nivelPadre}"><h3>${this.ucaseFirst(registros[i].nombre)}</h3><p>${registros[i].valor}</p></div>` })];
                        }
                    }
                } else if (registros[i].nombre) {
                    this.informeRegistros = [...this.informeRegistros, ({ concepto: { term: registros[i].nombre, semanticTag: registros[i].concepto.semanticTag }, valor: `<div class="nivel-${this.nivelPadre}"><h3>${this.ucaseFirst(registros[i].nombre)}</h3><p>${registros[i].valor ? registros[i].valor : ''}</p></div>` })];
                }
            }
            if (registros[i] && registros[i].registros && registros[i].registros.length > 0) {
                let template = this.esHallazgo(registros[i].concepto.semanticTag) ? this.hallazgoTemplate : (this.esProcedimiento(registros[i].concepto.semanticTag) ? this.procedimientoTemplate : this.insumoTemplate);
                let reg = this.generarRegistro(registros[i], template);
                if (reg) {
                    this.informeRegistros[i] = reg;
                }
                this.nivelPadre = 0;
                this.generarInforme(registros[i].registros);
            }
        }
    }

    private static async generarHTML(req) {

        // Prestación
        let prestacion: any = await this.getPrestacionData(req.body.idPrestacion);

        // Títulos default
        let tituloFechaEjecucion = 'Fecha Ejecución';

        // Configuraciones de informe propios de la prestación
        let config: any = await this.getPrestacionInformeParams(prestacion.solicitud.tipoPrestacion.conceptId);

        if (!config) {
            config = await this.getPrestacionInformeComponent(prestacion.solicitud.tipoPrestacion.conceptId);
        }

        // Se crea un objecto nuevo
        config = JSON.parse(JSON.stringify(config));

        // Paciente
        let mpi: any = await Paciente.buscarPaciente(prestacion.paciente.id);
        let paciente = mpi.paciente;

        if (paciente.id && config) {

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
            } else {
                // Si tiene un hijo directo, usamos su nombre como título de la consulta
                tipoPrestacion = prestacion.solicitud.tipoPrestacion.term[0].toUpperCase() + prestacion.solicitud.tipoPrestacion.term.slice(1);
            }

            tipoPrestacion = tipoPrestacion[0].toUpperCase() + tipoPrestacion.slice(1);

            // Existe configuración de PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL?
            if (config.informe && config.informe.motivoPrincipalDeConsultaOverride) {
                if (prestacion.ejecucion.registros.length > 1) {
                    let existeConcepto = prestacion.ejecucion.registros.find(x => this.existeSemanticTagMPC(x.concepto.semanticTag) && x.esDiagnosticoPrincipal);

                    if (existeConcepto && existeConcepto.esDiagnosticoPrincipal && tituloRegistro && tituloRegistro.conceptId !== existeConcepto.concepto.conceptId) {
                        motivoPrincipalDeConsulta = existeConcepto;
                        if (motivoPrincipalDeConsulta) {
                            motivoPrincipalDeConsulta = '<b>PROCEDIMIENTO / DIAGNÓSTICO PRINCIPAL: </b>' + motivoPrincipalDeConsulta.concepto.term;
                        }
                    }
                }
            }

            // let registros = '';
            this.generarInforme(prestacion.ejecucion.registros[0].registros, config.requeridos);

            // Si no hay configuración de informe o si se configura "registrosDefault" en true, se genera el informe por defecto (default)
            if (!config.informe || config.informe.registrosDefault) {
                contenidoInforme = this.informeRegistros.filter(x => x !== undefined ? x : null);

                // let hallazgos, procedimientos, planes = [];
                // hallazgos = prestacion.ejecucion.registros.filter(x => this.esHallazgo(x.concepto.semanticTag));
                // procedimientos = prestacion.ejecucion.registros.filter(x => this.esProcedimiento(x.concepto.semanticTag));
                // planes = prestacion.ejecucion.registros.filter(x => x.esSolicitud === true);

                // hallazgos = this.crearHallazgos(hallazgos, hallazgoTemplate);
                // procedimientos = this.crearProcedimientos(procedimientos, procedimientoTemplate);
                // planes = this.crearPlanes(planes, planTemplate);


                // registros = [...hallazgos, ...procedimientos, ...planes].join('');

            }

            // Se leen header y footer (si se le pasa un encoding, devuelve un string)
            let html = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/informe.html'), 'utf8');

            let nombreCompleto = paciente.apellido + ', ' + paciente.nombre;
            let fechaNacimiento = paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('DD/MM/YYYY') : 's/d';
            let hoy = moment();
            let edad = paciente.fechaNacimiento ? hoy.diff(moment(paciente.fechaNacimiento), 'years') + ' años | ' : '';
            let datosRapidosPaciente = paciente.sexo + ' | ' + edad + paciente.documento;

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
                .replace('<!--fechaNacimiento-->', fechaNacimiento)
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
                // .replace('<!--contenidoInforme-->', contenidoInforme ? contenidoInforme : '')
                .replace('<!--registros-->', contenidoInforme.length ? contenidoInforme.map(x => typeof x.valor === 'string' ? x.valor : JSON.stringify(x.valor)).join('') : '');

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

            // Limpio el informe
            this.informeRegistros = [];
            this.nivelPadre = 0;

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
