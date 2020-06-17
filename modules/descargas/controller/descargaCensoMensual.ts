import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import * as path from 'path';
import * as moment from 'moment';

export class DocumentoCensoMensual {

    private static options: pdf.CreateOptions = {};

    private generarCSS() {
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

    async generarHTML(req) {
        return new Promise((resolve, reject) => {
            let html = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/censoMensual.html'), 'utf8');
            let params = req.body;
            // Se carga logo del efector, si no existe se muestra el nombre del efector como texto
            let nombreLogo = params.organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');
            try {
                let logoEfector;
                logoEfector = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/efectores/' + nombreLogo + '.png'));
                html = html
                    .replace('<!--logoOrganizacion-->', `<img class="logo-efector" src="data:image/png;base64,${logoEfector.toString('base64')}">`);
            } catch (fileError) {
                html = html
                    .replace('<!--logoOrganizacion-->', `<b class="no-logo-efector">${params.organizacion.nombre}</b>`);
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

            const fechaCensoDesde = moment(params.fechaDesde).format('DD/MM/YYYY');
            const fechaCensoHasta = moment(params.fechaHasta).format('DD/MM/YYYY');
            const unidadOrganizativa = params.unidad.term;

            let filas = '';
            for (let i = 0; i < params.listadoCenso.length; i++) {
                let censo = params.listadoCenso[i].censo;
                const fecha = moment(params.listadoCenso[i].fecha).format('DD/MM/YYYY');
                filas += `<tr><td>${fecha} </td>
                <td>${censo.existencia0}</td>
                <td>${censo.ingresos}</td>
                 <td>${censo.pasesDe}</td>
                 <td>${censo.egresosAlta}</td>
                <td>${censo.egresosDefuncion}</td>
                 <td>${censo.pasesA}</td>
                 <td>${censo.existencia24}</td>
                 <td>${censo.ingresoEgresoDia}</td>
                 <td>${censo.pacientesDia}</td>
                  <td>${censo.disponibles24}</td>
                  <td>${censo.diasEstada}</td>
                  </tr>`;
            }
            let filaTotal = '';
            let censoTot = params.resumenCenso;
            filaTotal = `<tr>
                     <td><strong>Totales</strong></td>
                     <td><strong>${ censoTot.existencia0}</strong></td>
                     <td><strong>${ censoTot.ingresos} </strong></td>
                     <td><strong>${ censoTot.pasesDe}</strong></td>
                     <td><strong>${ censoTot.egresosAlta}</strong></td>
                     <td><strong>${ censoTot.egresosDefuncion}</strong></td>
                     <td><strong>${ censoTot.pasesA}</strong></td>
                     <td><strong>${ censoTot.existencia24}</strong></td>
                     <td><strong>${ censoTot.ingresoEgresoDia}</strong></td>
                     <td><strong>${ censoTot.pacientesDia}</strong></td>
                     <td><strong>${ censoTot.disponibles24}</strong></td>
                     <td><strong>${ censoTot.diasEstada}</strong></td>
                 </tr>`;

            let filaResumen = '';
            if (params.datosCenso) {
                let resumen = params.datosCenso;
                filaResumen = `<tr>
                    <td>${ resumen.diasF}</td>
                    <td>${ resumen.promDis}</td>
                    <td>${ resumen.pacDia}</td>
                    <td>${ resumen.mortHosp}</td>
                    <td>${ resumen.promPer}</td>
                    <td>${ resumen.giroCama}</td>
                    <td>${ resumen.promDiasEstada}</td>
                    </tr>`;
            }


            html = html
                .replace('<!--fechaCensoDesde-->', fechaCensoDesde)
                .replace('<!--fechaCensoHasta-->', fechaCensoHasta)
                .replace('<!--unidadOrganizativa-->', unidadOrganizativa)
                .replace('<!--contenidoCenso-->', filas)
                .replace('<!--contenidoCensoTot-->', filaTotal)
                .replace('<!--ContenidoResumen-->', filaResumen);

            // FOOTER
            let fechaActual = moment(new Date());
            html = html
                .replace('<!--usuario-->', params.usuario)
                .replace('<!--fechaActual-->', fechaActual.format('DD [de] MMMM [de] YYYY'))
                .replace('<!--organizacionNombreSolicitud-->', params.organizacion.nombre);
            resolve(html);
        });

    }
    /**
         *
         * @param req ExpressJS request
         * @param res ExpressJS response
         * @param next ExpressJS next
         * @param options html-pdf/PhantonJS rendering options
         */
    public descargar(req, res, next, options = null) {

        return new Promise((resolve, reject) => {
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

            DocumentoCensoMensual.options = DocumentoCensoMensual.options || phantomPDFOptions;

            this.generarHTML(req).then(htmlPDF => {
                htmlPDF = htmlPDF + this.generarCSS();
                pdf.create(htmlPDF, DocumentoCensoMensual.options).toFile((err2, file): any => {

                    if (err2) {
                        return reject(err2);
                    }
                    resolve(file.filename);

                });
            });

        });
    }
}
