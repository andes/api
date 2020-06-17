import * as moment from 'moment';
import { loadImage, InformePDF, getAssetsURL } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class CensoMensualBody extends HTMLComponent {
    template = `
    <!-- Header -->
    <header id="pageHeader">
        <!-- Cabezal logos institucionales -->
        <section class="contenedor-logos">
            <span class="contenedor-logo-efector">
                <img class="logo-efector" src="data:image/png;base64,{{ logos.logoEfector }}">
            </span>
            <span class="contenedor-logos-secundarios">
                <img class="logo-adicional" src="data:image/png;base64,{{ logos.logoAdicional }}">
                <img class="logo-andes" src="data:image/png;base64,{{ logos.logoAndes }}">
            </span>
        </section>
        <section class="contenedor-data-origen">
            <!-- Datos paciente -->
            <span class="contenedor-principal-data">
                <div class="contenedor-secundario">
                    <h3>
                        Censo mensual
                    </h3>
                    <h5 class="bolder">
                        <strong>Fecha:</strong>
                        {{ fechaCensoDesde }}
                        -
                        {{ fechaCensoHasta }}
                    </h5>
                    <h5 class="bolder">Unidad organizativa:
                        {{ unidadOrganizativa }}
                    </h5>
                </div>
            </span>
        </section>
    </header>
    <!-- END Header -->
    <!-- Body -->
    <main>
        <section class="contenedor-informe">
            <table class="resumen table">
                <thead>
                    <tr>
                        <th rowspan="2">
                            <h6>Fecha</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Existencia 0 hs</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Ingresos</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Pases de</h6>
                        </th>
                        <th colspan="2">
                            <h6>Egreso</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Pases A</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Existencia 24 hs</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Ingresos- Egresos día</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Pacientes día</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Camas disponibles 24hs</h6>
                        </th>
                        <th rowspan="2">
                            <h6>Días de estada</h6>
                        </th>
                    </tr>
                    <tr>
                        <th>
                            <h6>Altas</h6>
                        </th>
                        <th>
                            <h6>Defunciones</h6>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {{#each filas}}
                        <tr>
                            <td> {{ fecha }} </td>
                            <td> {{ censo.existencia0 }} </td>
                            <td> {{ censo.ingresos }} </td>
                            <td> {{ censo.pasesDe }} </td>
                            <td> {{ censo.egresosAlta }} </td>
                            <td> {{ censo.egresosDefuncion }} </td>
                            <td> {{ censo.pasesA }} </td>
                            <td> {{ censo.existencia24 }} </td>
                            <td> {{ censo.ingresoEgresoDia }} </td>
                            <td> {{ censo.pacientesDia }} </td>
                            <td> {{ censo.disponibles24 }} </td>
                            <td> {{ censo.diasEstada }} </td>
                        </tr>
                    {{/each}}
                    <tr>
                        <td><strong>Totales</strong></td>
                        <td><strong> {{ censoTot.existencia0 }}</strong></td>
                        <td><strong> {{ censoTot.ingresos}} </strong></td>
                        <td><strong> {{ censoTot.pasesDe }}</strong></td>
                        <td><strong> {{ censoTot.egresosAlta }}</strong></td>
                        <td><strong> {{ censoTot.egresosDefuncion }}</strong></td>
                        <td><strong> {{ censoTot.pasesA }}</strong></td>
                        <td><strong> {{ censoTot.existencia24 }}</strong></td>
                        <td><strong> {{ censoTot.ingresoEgresoDia }}</strong></td>
                        <td><strong> {{ censoTot.pacientesDia }}</strong></td>
                        <td><strong> {{ censoTot.disponibles24 }}</strong></td>
                        <td><strong> {{ censoTot.diasEstada }}</strong></td>
                    </tr>
                </tbody>
            </table>

            <br><br>
            <table class="resumen table">
                <thead>
                    <tr>
                        <th>
                            <h6>Días de funcionamiento del servicio</h6>
                        </th>
                        <th>
                            <h6>Promedio diario de camas disponibles</h6>
                        </th>
                        <th>
                            <h6>Promedio diario de paciente día</h6>
                        </th>
                        <th>
                            <h6>Tasa de mortalidad hospitalaria</h6>
                        </th>
                        <th>
                            <h6>Promedio de permanencia</h6>
                        </th>
                        <th>
                            <h6>Giro Cama</h6>
                        </th>
                        <th>
                            <h6>Promedio días de estada</h6>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{ resumen.diasF }}</td>
                        <td>{{ resumen.promDis }}</td>
                        <td>{{ resumen.pacDia }}</td>
                        <td>{{ resumen.mortHosp }}</td>
                        <td>{{ resumen.promPer }}</td>
                        <td>{{ resumen.giroCama }}</td>
                        <td>{{ resumen.promDiasEstada }}</td>
                    </tr>
                </tbody>
            </table>

        </section>
    </main>
    <!-- END Body -->
    <!-- Footer -->
    <footer id="pageFooter">
        <!-- Firmas -->
        <span class="contenedor-firmas"></span>
        <hr>
        <span class="contenedor-zocalo">
            <img class="logo-pdp" src="data:image/png;base64,{{ logos.logoPDP }}">
            <!-- <img class="logo-pdp" src="assets/img/logo-pdp.png" alt=""> -->
            <article class="contenedor-data-pdpCenso">
                <h6> Nota: El contenido de este informe ha sido validado digitalmente siguiendo los estándares de
                    calidad y seguridad requeridos. El ministerio de salud de la provincia de Neuquén es responsable
                    inscripto en el Registro Nacional de Protección de Datos Personales, según lo requiere la Ley N°
                    25.326 (art. 3° y 21 inciso 1).</h6>
            </article>
            <article class="contenedor-data-organizacion">
                <h6>
                    {{{ organizacion.nombre }}}
                </h6>
            </article>
            <article class="contenedor-data-impresion">
                <h6 class="bolder">Impreso por:</h6>
                <h6>
                    {{ usuario }}
                </h6>
                <h6>
                    {{ fechaActual }}
                </h6>
            </article>
            <hr>
            <span class="numeracion">
                {{{ numeracionHTML }}}
            </span>
        </span>
    </footer>
    <!-- END Footer -->
    `;

    constructor(public usuario, public organizacion, public unidadOrganizativa, public fechaDesde, public fechaHasta, public listadoCenso, public resumenCenso, public datosCenso) {
        super();

        let nombreLogo = organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');

        listadoCenso.map((item) => {
            item.fecha = moment(item.fecha).format('DD/MM/YYYY');
        });

        this.data = {
            usuario,
            filas: listadoCenso,
            censoTot: resumenCenso,
            resumen: datosCenso,
            unidadOrganizativa,
            fechaCensoDesde: moment(fechaDesde).format('DD/MM/YYYY'),
            fechaCensoHasta: moment(fechaHasta).format('DD/MM/YYYY'),
            fechaActual: moment().format('DD [de] MMMM [de] YYYY'),
            organizacion: {
                nombre: organizacion.nombre.replace(' - ', '</br>'),
            },
            logos: {
                logoEfector: loadImage('templates/rup/informes/img/efectores/' + nombreLogo + '.png'),
                adicional: loadImage('templates/rup/informes/img/logo-adicional.png'),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
                logoPDP: loadImage('templates/rup/informes/img/logo-pdp.png')
            },
            numeracionHTML: '<small> {{page}} </small> de <small> {{pages}} </small>'
        };
    }
}
