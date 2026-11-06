import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';

export class FarmaciaBody extends HTMLComponent {
    template = `
        <div>
            <div class="rTable header-table">
              <div class="rTableRow">
                <div class="rTableCell1">
                  <span class="header-section-title">DATOS DEL PACIENTE</span>
                  <strong class="header-patient-name">{{ encabezado.data.apellido }} {{ encabezado.data.nombre }}</strong>
                  <span class="header-patient-info">{{ encabezado.data.sexo }} | {{#if encabezado.data.edad }}{{ encabezado.data.edad }} años | {{/if}}DNI: {{ encabezado.data.documento }}</span>
                </div>
              </div>
              <div class="rTableRow">
                <div class="rTableCell1" style="width: 100%;">
                  <span class="header-section-title">DATOS DEL PROTOCOLO / LABORATORIO</span>
                  <table class="protocolo-table" style="width: 100%; border-collapse: separate; border-spacing: 5px 0; margin-bottom: 4px;">
                    <tr>
                      <td style="background-color: #eee; padding: 3px 6px; font-size: .24cm; color: #333; border-radius: 2px; white-space: nowrap;">
                        PROTOCOLO N°: <strong style="font-size: .30cm; color: #000;">{{ encabezado.data.numero }}</strong>
                      </td>
                      <td style="background-color: #eee; padding: 3px 6px; font-size: .24cm; color: #333; border-radius: 2px; white-space: nowrap;">
                        FECHA: <strong style="font-size: .28cm; color: #000;">{{ encabezado.data.fecha }}</strong>
                      </td>
                      <td style="background-color: #eee; padding: 3px 6px; font-size: .24cm; color: #333; border-radius: 2px; white-space: nowrap;">
                        Prioridad: <strong style="font-size: .26cm; color: #000; text-transform: uppercase;">{{ encabezado.data.prioridad }}</strong>
                      </td>
                      <td style="width: 100%;"></td>
                    </tr>
                  </table>
                  <table class="protocolo-details-table" style="width: 100%; border-collapse: collapse; margin-top: 4px;">
                    <tr>
                      <td style="width: 60%; vertical-align: top; font-size: .21cm; line-height: 1.35; color: #333;">
                        Laboratorio: <strong style="color: #000;">{{ encabezado.data.laboratorio }}</strong><br/>
                        Efector Solicitante: <strong style="color: #000;">{{ encabezado.data.efectorSolicitante }}</strong><br/>
                        Solicitante: <strong style="color: #000;">{{ encabezado.data.solicitante }}</strong>
                      </td>
                      <td style="width: 40%; vertical-align: top; font-size: .21cm; line-height: 1.35; color: #333;">
                        Origen: <strong style="color: #000;">{{ encabezado.data.origen }}</strong><br/>
                        Servicio: <strong style="color: #000;">{{ encabezado.data.tipoServicio }}</strong>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
              <div class="rTableRow">
                <div class="rTableCell1">
                  <span class="header-section-title">PRÁCTICAS</span>
                </div>
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
                                            <div class="rTableCell1" style="text-decoration:underline;">Resultado</div>
                                            <div class="rTableCell1" style="text-decoration:underline;">VR</div>
                                            <div class="rTableCell1 small" style="text-decoration:underline;">Método | Fecha</div>
                                        {{else}}
                                            <div class="rTableCell1">
                                                {{item.nombre}}
                                            </div>
                                            <div class="rTableCell1">{{item.resultado}}&nbsp;&nbsp;&nbsp;
                                                {{#if unidadMedida}}
                                                    {{unidadMedida}}
                                                {{/if}}
                                            </div>
                                            <div class="rTableCell1 small">{{ item.valorReferencia}}</div>
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
                                            <div class="rTableCell1" style="text-decoration:underline;">Resultado</div>
                                            <div class="rTableCell1" style="text-decoration:underline;">VR</div>
                                            <div class="rTableCell1 small" style="text-decoration:underline;">Método | Fecha</div>
                                        {{else}}
                                            <div class="rTableCell1">
                                                &emsp;&emsp;{{nombre}}
                                            </div>
                                            <div class="rTableCell1">{{resultado}}&nbsp;&nbsp;&nbsp;
                                                {{#if unidadMedida}}
                                                    {{unidadMedida}}
                                                {{/if}}
                                            </div>
                                            <div class="rTableCell1 small">{{valorReferencia}}</div>
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
        const fechaNac = this.paciente[0]?.fechaNacimiento || this.encabezado.data.fechanacimiento || this.encabezado.data.fechaNacimiento;
        if (fechaNac) {
            this.encabezado.data.edad = moment().diff(moment(fechaNac), 'years');
        }
        this.encabezado.data.sexo = this.paciente[0]?.genero || this.encabezado.data.sexo;
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
