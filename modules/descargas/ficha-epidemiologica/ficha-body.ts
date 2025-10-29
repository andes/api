import { HTMLComponent } from '../model/html-component.class';

export class FichaEpidemiologicaBody extends HTMLComponent {
    template = `
        <main>
            <p class="texto-centrado">FICHA {{tipo}}</p>
            {{#each arreSecciones}}
                <h6><u>{{seccionNombre}}:</u></h6>
                {{#each arreFields}}
                    {{#if fieldValor.nombre}}
                        <p><b>{{fieldNombre}}:</b> {{fieldValor.nombre}}</p>
                    {{else}}
                        <p><b>{{fieldNombre}}:</b> {{fieldValor}}</p>
                    {{/if}}
                {{/each}}
            {{/each}}
        </main>
    `;

    constructor(public detalle, public ficha) {
        super();
    }

    public async process() {
        const arreSecciones = [];
        const regexISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
        this.detalle.secciones.forEach(seccion => {
            const seccionNombre = seccion.name.toUpperCase();
            const arreFields = [];
            const indiceSection = this.ficha.sections.findIndex(s => s.name === seccion.name);
            if (indiceSection > -1) {
                const fichaEpidemio = this.ficha.sections[indiceSection];
                const keys = seccion.fields.map(name => Object.keys(name)[0]);
                for (const itemFicha of fichaEpidemio.fields) {
                    const index = keys.findIndex(k => k === itemFicha.key);
                    if (index !== -1) {
                        const fieldNombre = itemFicha.label.toUpperCase();
                        let fieldValor: any = Object.values(seccion.fields[index])[0];

                        // En caso de que venga un valor booleano mostras SI o NO
                        if (typeof fieldValor === 'boolean') {
                            fieldValor = fieldValor ? 'SI' : 'NO';
                        }

                        // En caso de que el valor venga en un array se arma un string juntando los nombres
                        if (Array.isArray(fieldValor)) {
                            let nombre = '';
                            fieldValor.forEach(elemen => {
                                nombre = nombre + elemen.nombre + ', ';
                            });
                            nombre = nombre.slice(0, -2);
                            fieldValor = { nombre };
                        }

                        // En caso de que venga una fecha, se formatea de la forma DD/MM/AAAA
                        if (regexISO.test(fieldValor)) {
                            const fecha = new Date(fieldValor);
                            const anio = fecha.getFullYear();
                            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                            const dia = String(fecha.getDate()).padStart(2, '0');
                            fieldValor = `${dia}/${mes}/${anio}`;
                        }
                        arreFields.push({ fieldNombre, fieldValor });
                    }
                }
                arreSecciones.push({ seccionNombre, arreFields });
            }
        });

        this.data = {
            arreSecciones,
            tipo: this.detalle.type.name.toUpperCase(),
        };
    }
}
