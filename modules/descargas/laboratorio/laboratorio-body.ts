import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';

export class FarmaciaBody extends HTMLComponent {
    template = `
        <div>
            <div class="rTable header-table">
              <div class="rTableRow">
                <div class="rTableCell1">
                  &nbsp;Paciente: <strong>{{ encabezado.data.apellido }} {{ encabezado.data.nombre }}</strong>
                  <br/>&nbsp;DNI: <strong>{{ encabezado.data.documento }}</strong>
                </div>
                <div class="rTableCell2">
                  Fecha Nac.: <strong>{{ encabezado.data.fechanacimiento }}</strong>
                </div>
                <div class="rTableCell2">
                  Género: <strong>{{ encabezado.data.sexo }}</strong>
                </div>
              </div>
              <div class="rTableRow">
                <div class="rTableCell1">
                  &nbsp;Laboratorio: <strong>{{ encabezado.data.laboratorio }}</strong>
                  <br/>&nbsp;Efector solicitante: <strong>{{ encabezado.data.efectorSolicitante }}</strong>
                </div>
                <div class="rTableCell2">
                  Orden Nro: <strong>{{ encabezado.data.numero }}</strong>
                  <br/>Origen: <strong>{{ encabezado.data.origen }}</strong>
                </div>
                <div class="rTableCell2">
                  Fecha: <strong>{{ encabezado.data.fecha }}</strong>
                  <br/>Prioridad: <strong>{{ encabezado.data.prioridad }}</strong>
                </div>
              </div>
              <div class="rTableRow">
                <div class="rTableCell1">
                  &nbsp;Solicitante: <strong>{{ encabezado.data.solicitante }}</strong>
                </div>
                <div class="rTableCell2">
                  Tipo de Servicio: <strong>{{ encabezado.data.tipoServicio }}</strong>
                </div>
                <div class="rTableCell2">
                  Muestra: <strong>{{ encabezado.data.tipoMuestra }}</strong>
                </div>
              </div>
              <div class="rTableRow">
                <div class="rTableCell1">
                  &nbsp;Prácticas: <strong>{{ encabezado.data.practicas }}</strong>
                </div>
                <div class="rTableCell2"></div>
                <div class="rTableCell2"></div>
              </div>
            </div>
            <br/>
            <section class="contenedor-informe">
                <article class="cabezal-conceptos horizontal">
                    <div class="rTable">
                        {{#each areas}}
                        <div class="rTableRow">
                            <div class="rTableCell1" style="text-decoration:underline;padding: 4px 0 2px 0; "><strong>{{area}}</strong></div>
                            <div class="rTableCell2"></div>
                            <div class="rTableCell2"></div>
                            <div class="rTableCell2"></div>
                        </div>
                            {{#each grupos}}
                                {{#if item}}
                                    <div class="rTableRow">
                                        {{#if item.esTitulo}}
                                            <div class="rTableCell1">
                                                <span style="text-decoration:underline;"><strong>{{item.nombre}}</strong></span>
                                            </div>
                                            <div class="rTableCell1"></div>
                                            <div class="rTableCell1"></div>
                                            <div class="rTableCell1 small"></div>
                                        {{else}}
                                            <div class="rTableCell1">
                                                {{item.nombre}}
                                            </div>
                                            <div class="rTableCell1">{{item.resultado}} {{item.unidadMedida}}</div>
                                            <div class="rTableCell1">{{ item.valorReferencia}}</div>
                                            <div class="rTableCell1 small">
                                                {{#if item.metodo}}
                                                    {{ item.metodo }}
                                                {{/if}}
                                                {{#if item.fechaHoraValida}}
                                                    {{#if item.metodo}} | {{/if}}{{item.fechaHoraValida}}
                                                {{/if}}
                                            </div>
                                        {{/if}}
                                    </div>
                                {{/if}}
                                {{#if grupo}}
                                    <div class="rTableRow">
                                        <div class="rTableCell1"><strong>{{grupo}}</strong></div>
                                        <div class="rTableCell1"></div>
                                        <div class="rTableCell1 small"></div>
                                        <div class="rTableCell1 small"></div>
                                    </div>
                                {{/if}}
                                {{#each items}}
                                    <div class="rTableRow">
                                        {{#if esTitulo}}
                                            <div class="rTableCell1">
                                                &emsp;&emsp;<span style="text-decoration:underline;"><strong>{{nombre}}</strong></span>
                                            </div>
                                            <div class="rTableCell1"></div>
                                            <div class="rTableCell1"></div>
                                            <div class="rTableCell1 small"></div>
                                        {{else}}
                                            <div class="rTableCell1">
                                                &emsp;&emsp;{{nombre}}
                                            </div>
                                            <div class="rTableCell1">{{resultado}} {{unidadMedida}}</div>
                                            <div class="rTableCell1">{{valorReferencia}}</div>
                                            <div class="rTableCell1 small">
                                                {{#if metodo}}
                                                    {{ metodo }}
                                                {{/if}}
                                                {{#if fechaHoraValida}}
                                                    {{#if metodo}} | {{/if}}{{fechaHoraValida}}
                                                {{/if}}
                                            </div>
                                        {{/if}}
                                    </div>
                                {{/each}}
                            {{/each}}
                            
                            <!-- FIRMAS AREA -->
                            {{#if firmasArea}}
                            <div class="rTableRow">
                                <div class="rTableCell1">
                                <hr/>
                                Firmado electrónicamente por:
                                {{#each firmasArea}}
                                    <div>{{this}}</div>
                                {{/each}}
                                </div>
                                <div class="rTableCell2"></div>
                                <div class="rTableCell2"></div>
                                <div class="rTableCell2"></div>
                            </div>
                            {{/if}}
                        {{/each}}
                    </div>
                </article>
            </section>
        </div>
    `;

    constructor(public encabezado, public paciente, public detalle, public tipoUsuario) {
        super();
    }

    public async process() {
        this.encabezado.data.fecha = moment(this.encabezado.data.fecha).format('DD-MM-YYYY');
        this.encabezado.data.fechanacimiento = moment(this.encabezado.data.fechanacimiento || this.encabezado.data.fechaNacimiento).format('DD-MM-YYYY');
        this.encabezado.data.sexo = this.paciente[0].genero;
        if (this.encabezado.data.estado !== 'EnProceso') {
            this.encabezado.data.estado = null;
        } else {
            this.encabezado.data.estado = 'En Proceso';
        }

        if (this.tipoUsuario === 'paciente-token') {
            this.detalle.forEach(d => {
                d.grupos.forEach(grupo => {

                    grupo.items.forEach(subItem => {

                        if (subItem.codificaHiv) {
                            subItem.resultado = 'Este resultado debe ser entregado personalmente en el establecimiento de salud.';
                            subItem.unidadMedida = '';
                            subItem.valorReferencia = '';
                        }
                    });
                });
            });
        }

        if (this.paciente[0].alias) {
            this.encabezado.data.nombre = this.paciente[0].alias;
        }

        if (Array.isArray(this.detalle)) {
            for (const area of this.detalle) {
                const firmasArea = new Set<string>();
                if (area.grupos) {
                    for (const grupo of area.grupos) {
                        if (grupo.items) {
                            for (const item of grupo.items) {
                                if (item.firma) {
                                    firmasArea.add(item.firma);
                                }
                            }
                        }
                    }
                }
                area.firmasArea = firmasArea.size > 0 ? Array.from(firmasArea) : null;
            }
        }

        this.encabezado.data.documento = this.encabezado.data.numeroDocumento || this.encabezado.data.documento;
        this.encabezado.data.origen = this.encabezado.data.origen || 'AMBULATORIO';
        this.encabezado.data.solicitante = this.encabezado.data.solicitante || this.encabezado.data.medicoSolicitante || this.encabezado.data.profesionalSolicitante || this.encabezado.data.profesional || 'NO INFORMADO';
        this.encabezado.data.prioridad = this.encabezado.data.prioridad || 'RUTINA';
        this.encabezado.data.efectorSolicitante = this.encabezado.data.efectorSolicitante || this.encabezado.data.EfectorSolicitante || this.encabezado.data.efector || '';
        this.encabezado.data.tipoMuestra = this.encabezado.data.tipoMuestra || this.encabezado.data.TipoMuestra || '';
        this.encabezado.data.practicas = this.encabezado.data.practicas || this.encabezado.data.practicasSolicitadas || this.encabezado.data.Practicas || '';
        this.encabezado.data.laboratorio = this.encabezado.data.Laboratorio || this.encabezado.data.laboratorio || '';
        this.encabezado.data.tipoServicio = this.encabezado.data.TipoServicio || this.encabezado.data.tipoServicio || '';

        let sexoMap = this.encabezado.data.sexo || this.encabezado.data.sexobiologico;
        if (sexoMap === 'M') { sexoMap = 'Masculino'; }
        if (sexoMap === 'F') { sexoMap = 'Femenino'; }
        this.encabezado.data.sexo = sexoMap;

        this.data = {
            areas: this.detalle,
            encabezado: this.encabezado
        };
    }
}
