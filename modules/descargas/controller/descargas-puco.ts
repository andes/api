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

export class Documento {

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

    private static async generarConstanciaPuco(req) {
        let html = fs.readFileSync(path.join(__dirname, '../../../templates/puco/constancia.html'), 'utf8');

        // logo header
        let headerConstancia;
        let padron;
        let textFooter: string;
        let fechaActual = moment(new Date());
        if (req.body.financiador === 'Programa SUMAR') {
            padron = 'SUMAR';
            headerConstancia = fs.readFileSync(path.join(__dirname, '../../../templates/puco/img/header_sumar.png'));
            textFooter = 'Por la presente DEJO CONSTANCIA que la persona antes detallada está INSCRIPTA EN EL PLAN SUMAR.<br/>' +
                'Reune los requisitos necesarios para el proceso de validación.<br/><br/>' +
                'VÁLIDO PARA SER PRESENTADO ANTE AUTORIDADES DE ANSES.<br/>' +
                'VÁLIDO DENTRO DE LOS 60 DÍAS DE LA FECHA DE EMISIÓN.<br/>' +
                'Sin otro particular, saluda atentamente<br/>';
        } else {
            padron = 'PUCO';
            headerConstancia = fs.readFileSync(path.join(__dirname, '../../../templates/puco/img/header-puco.jpg'));
            textFooter = '(La presente tiene carácter de declaración jurada a los efectos de la Ley Provincial 3012, y ' +
                'Disposición Provincial 1949/' + fechaActual.format('YYYY');
        }

        // HEADER
        html = html
            .replace('<!--logoHeader-->', `<img class="logoHeader" src="data:image/jpg;base64,${headerConstancia.toString('base64')}">`);

        // BODY
        html = html
            .replace('<!--nombre-->', req.body.nombre)
            .replace('<!--dni-->', req.body.dni)
            .replace('<!--financiador-->', req.body.codigoFinanciador + ' ' + req.body.financiador)
            .replace('<!--fechaActual-->', fechaActual.format('DD [de] MMMM [de] YYYY'))
            .replace('<!--claveBeneficiario-->', (req.body.claveBeneficiario) ? 'Clave de Beneficiario: ' + req.body.claveBeneficiario : '')
            .replace('<!--textFooter-->', textFooter)
            .replace('<!--padron-->', padron);
        return html;
    }

    private static generarCssPuco() {
        let scssFile = path.join(__dirname, '../../../templates/puco/constancia.scss');

        // Se agregan los estilos
        let css = '<style>\n\n';

        // SCSS => CSS
        css += scss.renderSync({
            file: scssFile
        }).css;
        css += '</style>';
        return css;
    }


    // Descarga/imprime constancia solicitada desde pantalla de consulta de padrones PUCO
    static descargarDocPuco(req, res, next, options = null) {
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

                    this.generarConstanciaPuco(req).then(htmlPDF => {
                        htmlPDF = htmlPDF + this.generarCssPuco();
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
