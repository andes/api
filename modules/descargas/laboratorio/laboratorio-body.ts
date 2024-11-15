import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';

export class FarmaciaBody extends HTMLComponent {
    template = `
      <main>
        <table border="1" width="100%" class="tabla-header">
          <tr>
          <td width="35%"><b>Paciente: </b>{{encabezado.data.apellido }} {{encabezado.data.nombre}}</td>
          <td width="15%"><b>Fecha de Nacimiento: </b>{{encabezado.data.fechanacimiento}}</td>
          <td width="15%"><b>Género: </b>{{encabezado.data.sexo}}</td>
          <td width="15%"><b>DNI: </b>{{encabezado.data.documento}}</td>
        </tr>
        <tr>
          <td width="35%"><b>Solicitante: </b>{{encabezado.data.medicoSolicitante}}</td>
          <td width="15%"><b>Orden Nro: </b> {{encabezado.data.numero}}</td>
          <td width="15%"><b>Fecha: </b>{{encabezado.data.fecha}}</td>
          <td width="15%"><b>Origen: </b>{{encabezado.data.origen}}</td>
        </tr>
          <td colspan="1"><b>Efector solicitante: </b>{{encabezado.data.efectorSolicitante}}</td>
          <td colspan="3"><b>Laboratorio: </b>{{encabezado.data.Laboratorio}}</td>  	
      </table>

      {{#each areas}}
        <div class="tituloGeneral"><u>{{area}}</u> </div>
        {{#each grupos}}
          {{#if visible}}
            <div class="tituloSecundario"><b> {{grupo}} </b></div>
          {{/if}}
          {{#each items}}
            {{#if esTitulo}}
              <div class="tituloTabla"><u>{{nombre}}</u></div>
            {{else}}
              <table class="tituloTabla">
                <tr>
                  <td width="25%">{{nombre}}</td>
                  <td width="25%"><i>{{resultado }} {{ unidadMedida}}</i></td>
                  <td width="25%">{{valorReferencia }} {{metodo}}</td>
                  <td width="25%"><i>{{userValida}}</i></td>
                </tr>
              </table>
            {{/if}}
          {{/each}}
        {{/each}}
      {{/each}}
        </main>
    `;

    constructor(public encabezado, public paciente, public detalle) {
        super();
    }

    public async process() {
        const setAreas = new Set(this.detalle.map(d => d.area));
        const areasStr = Array.from(setAreas);

        const areas = [];
        areasStr.forEach(area => {
            const detallesArea = this.detalle.filter(d => d.area === area);
            const setGrupos = new Set(detallesArea.map(d => d.grupo));
            const grupos = Array.from(setGrupos);

            const item = {
                area,
                grupos: grupos.map(g => {
                    const detallesAreaGrupo = detallesArea.filter(da => da.grupo === g);
                    const res: any = {};
                    const toItem = (e) => ({
                        nombre: e.item,
                        esTitulo: e.esTitulo === 'True' ? true : false,
                        resultado: e.resultado || e.Resultado,
                        metodo: e.Metodo,
                        valorReferencia: e.valorReferencia,
                        unidadMedida: e.unidadMedida || e.UnidadMedida,
                        userValida: e.userValida
                    });
                    res.grupo = g;
                    if (detallesAreaGrupo.length === 1 && detallesAreaGrupo[0].grupo === g) {
                        res.items = [toItem(detallesAreaGrupo[0])];
                        res.visible = false;
                    } else {
                        res.visible = true;
                        res.items = detallesAreaGrupo.map(toItem);
                    }
                    return res;
                })
            };

            areas.push(item);
        });

        this.encabezado.data.fecha = moment(this.encabezado.data.fecha).format('DD-MM-YYYY');
        this.encabezado.data.fechanacimiento = moment(this.encabezado.data.fechanacimiento).format('DD-MM-YYYY');
        this.encabezado.data.sexo = this.paciente[0].genero;
        if (this.paciente[0].alias) {
            this.encabezado.data.nombre = this.paciente[0].alias;
        }
        this.data = {
            areas,
            encabezado: this.encabezado
        };
    }
}
