import * as moment from 'moment';
import { loadImage, InformePDF, getAssetsURL } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class CensoBody extends HTMLComponent {
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
                            <h4>
                                Censo diario
                            </h4>
                            <h5 class="bolder">Fecha:
                                {{ fechaCenso }}
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
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Cama</th>
                                <th>Ingreso</th>
                                <th>Pase de</th>
                                <th>Egreso</th>
                                <th>Pase a</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{#each filas}}
                                <tr>
                                    <td> {{ datos.paciente.apellido }}, {{ datos.paciente.nombre }} | {{ datos.paciente.documento }} </td>
                                    <td> {{ datos.cama.nombre }},
                                        {{#each datos.cama.sectores}}
                                            {{#if @last}}
                                                {{ nombre }}
                                            {{/if}}
                                        {{/each}}
                                    </td>
                                    <td>
                                        {{#if ingreso }}
                                            {{ ingreso }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if paseDe }}
                                            {{ paseDe }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if egreso }}
                                            {{ egreso }}
                                        {{/if}}
                                    </td>
                                    <td>
                                        {{#if paseA }}
                                            {{ paseA }}
                                        {{/if}}
                                    </td>
                                </tr>
                            {{/each}}
                        </tbody>
                    </table>
                    <br><br>
                    <table class="resumen table">
                        <thead>
                            <tr>
                                <th rowspan="2">
                                    <h6>Existencia a las 0 hs</h6>
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
                                    <h6>Existencia a las 24 hs</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Ingresos y egresos del día</h6>
                                </th>
                                <th rowspan="2">
                                    <h6>Pacientes día</h6>
                                </th>
                                <!-- <th rowspan="2">
                                    <h6>Camas disponibles a las 0hs</h6>
                                </th> -->
                                <th rowspan="2">
                                    <h6>Camas disponibles a las 24hs</h6>
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
                            {{#if filaResumen }}
                                <tr>
                                    <td> {{ filaResumen.existencia0 }} </td>
                                    <td> {{ filaResumen.ingresos }} </td>
                                    <td> {{ filaResumen.pasesDe }} </td>
                                    <td> {{ filaResumen.egresosAlta }} </td>
                                    <td> {{ filaResumen.egresosDefuncion }} </td>
                                    <td> {{ filaResumen.pasesA }} </td>
                                    <td> {{ filaResumen.existencia24 }} </td>
                                    <td> {{ filaResumen.ingresoEgresoDia }} </td>
                                    <td> {{ filaResumen.pacientesDia }} </td>
                                    <td> {{ filaResumen.disponibles24 }} </td>
                                </tr>
                            {{/if}}
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
                    <article class="contenedor-data-pdp">
                        <h6>Nota: El contenido de este informe ha sido validado digitalmente siguiendo los estándares de
                            calidad y seguridad
                            requeridos. El ministerio de salud de la provincia de Neuquén es responsable inscripto en el
                            Registro
                            Nacional de Protección de Datos Personales, según lo requiere la Ley N° 25.326 (art. 3° y 21 inciso
                            1).</h6>
                    </article>
                    <article class="contenedor-data-organizacion">
                        <h6>
                            {{{ organizacion.nombre }}}
                        </h6>
                        <h6></h6>
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

    constructor(public usuario, public fechaCenso, public organizacion, public unidadOrganizativa, public listadoCenso, public resumenCenso) {
        super();

        let nombreLogo = organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');
        const index = organizacion.nombre.indexOf('-');
        const nombre = organizacion.nombre.substr(0, index).trim();
        const nombre2 = organizacion.nombre.substr(index + 1).trim();

        this.data = {
            usuario,
            filas: listadoCenso,
            filaResumen: resumenCenso,
            fechaCenso,
            unidadOrganizativa,
            fechaAcual: moment().format('DD/MM/YYYY HH:mm') + ' hs',
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
