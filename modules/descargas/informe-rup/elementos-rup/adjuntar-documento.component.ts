import { HTMLComponent } from '../../model/html-component.class';
import * as mime from 'mime-types';
import * as rupStore from '../../../rup/controllers/rupStore';


export class AdjuntarDocumentoComponent extends HTMLComponent {
    template = `
            <div style="page-break-before: always; page-break-after: always;">
                <div class="nivel-1" >
                    <p>
                        {{ registro.concepto.term }}
                        {{#if noSoportados}} (Hay {{noSoportados}} documentos que no se pueden visualizar) {{/if}}
                        :
                    </p>
                </div>
                {{#each documentos}}
                    <div class="subregistro">
                        <p> {{ term }}: </p>
                        <img class="w-25 archivo-adjunto" src="data:image/png;base64,{{img}}">
                    </div>
                {{/each}}
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const documentos = await Promise.all(this.getImages());
        const noSoportados = this.getCantidadNoSoportados();
        this.data = {
            registro: this.registro,
            documentos,
            noSoportados
        };
    }


    getImages() {
        return this.registro.valor.documentos
            .filter(doc => mime.lookup(doc.ext).indexOf('image') > -1)
            .map(documento => {
                return new Promise(async (resolve, reject) => {
                    const archivo = await rupStore.readFile(documento.id);
                    const base64 = await rupStore.streamToBase64(archivo.stream);
                    return resolve({ img: base64, term: documento?.descripcion?.term });
                });
            });
    }

    getCantidadNoSoportados() {
        return this.registro.valor.documentos.filter(x => mime.lookup(x.ext).indexOf('image') === -1).length;
    }
}
