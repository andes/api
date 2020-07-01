import * as moment from 'moment';
import { loadImage, InformePDF, getAssetsURL } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class CensoMensualBody extends HTMLComponent {
    template = `
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
   `;

    constructor(public listadoCenso, public resumenCenso, public datosCenso) {
        super();

        listadoCenso.map((item) => {
            item.fecha = moment(item.fecha).format('DD/MM/YYYY');
        });

        this.data = {
            filas: listadoCenso,
            censoTot: resumenCenso,
            resumen: datosCenso,
        };
    }
}
