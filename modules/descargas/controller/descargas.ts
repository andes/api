import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import * as moment from 'moment';
import { Auth } from '../../../auth/auth.class';
import { model as Prestacion } from '../../rup/schemas/prestacion';
import * as Paciente from '../../../core/mpi/controller/paciente';
import { model as Org } from '../../../core/tm/schemas/organizacion';
import * as path from 'path';

moment.locale('es');

export class Documento {


    private static locale = 'es-ES';
    private static timeZone = 'America/Argentina/Buenos_Aires';

    // Se leen header y footer (si se le pasa un encoding, devuelve un string)
    private static headerHTML = fs.readFileSync('./templates/andes/html/header.html', 'utf8');
    private static footerHTML = fs.readFileSync('./templates/andes/html/footer.html', 'utf8');

    /**
     * Opciones default de PDF rendering
     */
    private static options: pdf.CreateOptions = {};


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

    private static async generarHTMLv2(req) {

        let prestacion: any = await this.getPrestacionData(req.body.idPrestacion);
        let paciente: any = await Paciente.buscarPaciente(prestacion.paciente.id);
        paciente = paciente.paciente; // SI, YA SÉ

        if (paciente.id) {

            let tituloInforme = prestacion.ejecucion.registros[0].nombre;
            let contenidoInforme = prestacion.ejecucion.registros[0].valor;

            // Se leen header y footer (si se le pasa un encoding, devuelve un string)
            let html = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/informe.html'), 'utf8');

            let header = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/header.html'), 'utf8');

            let nombreCompleto = paciente.apellido + ', ' + paciente.nombre;
            let fechaNacimiento = paciente.fechaNacimiento;
            let datosRapidosPaciente = paciente.sexo + ' | ' + moment(fechaNacimiento).fromNow(true) + ' | ' + paciente.documento;

            let idOrg = (Auth.getOrganization(req, 'id') as any);
            let organizacion: any = await this.getOrgById(idOrg);

            let nroCarpeta = paciente.carpetaEfectores.find(x => x.organizacion.id === idOrg);

            let profesionalSolicitud = prestacion.solicitud.profesional.apellido + ', ' + prestacion.solicitud.profesional.nombre;

            header = header
                .replace('<!--paciente-->', nombreCompleto)
                .replace('<!--datosRapidosPaciente-->', datosRapidosPaciente)
                .replace('<!--fechaNacimiento-->', moment(fechaNacimiento).format('DD/MM/YYYY'))
                .replace('<!--nroCarpeta-->', (typeof nroCarpeta !== 'undefined' ? nroCarpeta : 'sin nro de carpeta'))
                // .replace('<!--obraSocial-->', paciente.financiador[0] || '')
                .replace('<!--organizacionNombreSolicitud-->', prestacion.solicitud.organizacion.nombre)
                .replace('<!--orgacionacionDireccionSolicitud-->', organizacion.direccion.valor)
                .replace('<!--fechaSolicitud-->', moment(prestacion.solicitud.fecha).format('DD/MM/YYYY'))
                .replace('<!--profesionalSolicitud-->', profesionalSolicitud);

            let fechaEjecucion = new Date(prestacion.estados.find(x => x.tipo === 'ejecucion').createdAt);
            let fechaValidacion = new Date(prestacion.estados.find(x => x.tipo === 'validada').createdAt);

            html = html
                .replace('<!--tipoPrestacion-->', prestacion.solicitud.tipoPrestacion.term)
                .replace('<!--fechaSolicitud-->', moment(prestacion.solicitud.fecha).format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--fechaEjecucion-->', moment(fechaEjecucion).format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--fechaValidacion-->', moment(fechaValidacion).format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--tituloInforme-->', tituloInforme)
                .replace('<!--contenidoInforme-->', contenidoInforme);


            let footer = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/includes/footer.html'), 'utf8');

            footer = footer
                .replace('<!--profesionalFirmante1-->', profesionalSolicitud)
                .replace('<!--usuario-->', Auth.getUserName(req))
                .replace(/(<!--fechaActual-->)/g, moment().format('DD/MM/YYYY HH:mm') + ' hs');
            // .replace('<!--profesionalFirmante2-->', '');

            html = header + html + footer;

            // Se cargan logos
            let logoEfector = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-efector.png'));
            let logoAdicional = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-adicional.png'));
            let logoAndes = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-andes-h.png'));
            let logoPDP = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-pdp.png'));
            let logoPDP2 = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-pdp-h.png'));

            // Firmas
            // let firma1 = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/firmas/firma-1.png'));
            // let firma2 = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/firmas/firma-2.png'));

            html = html
                .replace('<!--logoOrganizacion-->', `<img class="logo-efector" src="data:image/png;base64,${logoEfector.toString('base64')}">`)
                .replace('<!--logoAdicional-->', `<img class="logo-adicional" src="data:image/png;base64,${logoAdicional.toString('base64')}">`)
                .replace('<!--logoAndes-->', `<img class="logo-andes" src="data:image/png;base64,${logoAndes.toString('base64')}">`)
                // .replace('<!--firma1-->', `<img class="logo-andes" src="data:image/png;base64,${firma1.toString('base64')}">`)
                // .replace('<!--firma2-->', `<img class="logo-andes" src="data:image/png;base64,${firma2.toString('base64')}">`)
                .replace('<!--logoPDP-->', `<img class="logo-pdp" src="data:image/png;base64,${logoPDP.toString('base64')}">`)
                .replace('<!--logoPDP2-->', `<img class="logo-pdp-h" src="data:image/png;base64,${logoPDP2.toString('base64')}">`);

            return html;
        } else {
            return 'ERROR';
        }
    }

    /**
     *
     * @param req ExpressJS request
     * TODO: Extender
     */
    private static generarHTML(req) {

        // SCSS según Tipo de Prestación
        const scssFile = typeof req.body.scssFile !== 'undefined' ? req.body.scssFile : 'prestacion-print';

        // Se genera HTML para ser transformado en PDF
        let html = Buffer.from(req.body.html, 'base64').toString();

        // Se agregan los estilos CSS
        html += this.generarCSS(path.join(__dirname, '../../../templates/rup/' + scssFile + '.scss'));

        // Se cargan logos
        let logoAndes = fs.readFileSync(path.join(__dirname, '../../../templates/andes/logo-andes.png'));
        let logotipoAndes = fs.readFileSync(path.join(__dirname, '../../../templates/andes/logotipo-andes-blue.png'));
        let logoPDP = fs.readFileSync(path.join(__dirname, '../../../templates/andes/logo-pdp.png'));

        html += this.headerHTML;
        html += this.footerHTML;

        // Se reemplazan ciertos <!--placeholders--> por logos de ANDES y Dirección de Protección de Datos Personales
        // Y datos de sesión (organización, nombre del usuario, timestamp)
        html = html.replace('<!--logoAndes-->', `<img class="logoAndes" src="data:image/png;base64,${logoAndes.toString('base64')}">`)
            .replace('<!--logotipoAndes-->', `<img class="logotipoAndes" src="data:image/png;base64,${logotipoAndes.toString('base64')}">`)
            .replace('<!--logoPDP-->', `<img class="logoPDP" src="data:image/png;base64,${logoPDP.toString('base64')}">`)
            .replace('<!--organizacion-->', Auth.getOrganization(req, 'nombre'))
            .replace('<!--usuario-->', JSON.stringify(Auth.getUserName(req)))
            .replace('<!--timestamp-->', new Date().toLocaleString('locale', { timeZone: this.timeZone }));

        return html;
    }

    private static generarCSSv2() {
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
     * Genera CSS de RUP
     */
    private static generarCSS(scssFile = path.join(__dirname, '../../../templates/rup/prestacion-print.scss')) {

        // Se agregan los estilos
        let css = '<style>\n\n';

        // SCSS => CSS
        css += scss.renderSync({
            file: scssFile,
            includePaths: [
                path.join(__dirname, '../../../templates/rup/')
            ]
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
    static descargarV2(req, res, next, options = null) {

        return new Promise((resolve, reject) => {

            let html = '';
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
                            height: '6.5cm',
                        },
                        footer: {
                            height: '1cm',
                            contents: {}
                        }
                    };

                    if (options !== null) {
                        this.options = options;
                    } else {
                        this.options = phantomPDFOptions;
                    }

                    this.generarHTMLv2(req).then(htmlPDF => {
                        htmlPDF = htmlPDF + this.generarCSSv2();
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

    static descargar(req, res, next, options = null) {

        return new Promise((resolve, reject) => {

            let html = '';
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
                            height: '6.5cm',
                        },
                        footer: {
                            height: '1cm',
                            contents: {}
                        }
                    };

                    if (options !== null) {
                        this.options = options;
                    } else {
                        this.options = phantomPDFOptions;
                    }

                    html = this.generarHTML(req);

                    pdf.create(html, this.options).toFile((err2, file): any => {

                        if (err2) {
                            reject(err2);
                        }

                        resolve(file.filename);

                    });
                    break;
            }

        });
    }

}
