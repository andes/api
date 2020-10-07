import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import * as moment from 'moment';
import * as path from 'path';
import { env } from 'process';
let phantomjs = require('phantomjs-prebuilt-that-works');

moment.locale('es');

// Muestra mensaje y línea de un error dentro de una promise ;-)
if (env.NODE_ENV !== 'production') {
    // tslint:disable-next-line:no-console
    process.on('unhandledRejection', r => console.log(r));
}

export class DocumentoRecupero {

    /**
     * Opciones default de PDF rendering
     */
    private static options: pdf.CreateOptions = {
        // Nos aseguramos que usa el paquete que queremos
        phantomPath: phantomjs.path
    };

    static ucaseFirst(titulo: string) {
        return titulo[0].toLocaleUpperCase() + titulo.slice(1).toLocaleLowerCase();
    }

    private static async generarRecuperoCosto(req) {       
        let html = fs.readFileSync(path.join(__dirname, '../../../templates/recupero-costo/formulario.html'), 'utf8');

        // logo header
        let headerConstancia;
        let padron;
        let textFooter: string;
        let fechaActual = moment(new Date());

        // BODY
        html = html
            .replace('<!--fechaActual-->', fechaActual.format('DD [de] MMMM [de] YYYY'))
            .replace('<!--efector-->', req.body.efector)
            .replace('<!--efectorCodigoSisa-->', req.body.efectorCodigoSisa)
            .replace('<!--nombre-->', req.body.nombre)
            .replace('<!--dni-->', req.body.dni)
            .replace('<!--sexo-->', req.body.sexo)
            .replace('<!--edad-->', req.body.edad)
            .replace('<!--horaInicio-->', req.body.horaInicio)
            .replace('<!--tipoPrestacion-->', req.body.tipoPrestacion)
            .replace('<!--obraSocial-->', req.body.obraSocial)
            .replace('<!--codigoOs-->', req.body.codigoOs)


        return html;
    }

    private static generarCssRecupero() {
        let scssFile = path.join(__dirname, '../../../templates/recupero-costo/formulario.scss');

        // Se agregan los estilos
        let css = '<style>\n\n';

        // SCSS => CSS
        css += scss.renderSync({
            file: scssFile
        }).css;
        css += '</style>';
        return css;
    }


    // Descarga/imprime constancia solicitada desde pantalla
    static descargarRecuperoCosto(req, res, next, options = null) {
        return new Promise((resolve, reject) => {

            switch (req.params.tipo) {
                case 'pdf':
                    // PhantomJS PDF rendering options
                    // https://www.npmjs.com/package/html-pdf
                    // http://phantomjs.org/api/webpage/property/paper-size.html
                    let phantomPDFOptions: pdf.CreateOptions = {
                        format: 'A4',
                        border: {
                            // default is 0, units: mm, cm, in, px
                            top: '0cm',
                            right: '0cm',
                            bottom: '0cm',
                            left: '0cm'
                        },
                        header: {
                            height: '0cm'
                        },
                        footer: {
                            height: '1cm',
                            contents: {}
                        }
                    };

                    this.options = options || phantomPDFOptions;

                    this.generarRecuperoCosto(req).then(htmlPDF => {
                        htmlPDF = htmlPDF + this.generarCssRecupero();
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
