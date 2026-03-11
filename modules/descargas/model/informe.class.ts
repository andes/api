import * as fs from 'fs';
import * as path from 'path';
import * as scss from 'node-sass';
import { HTMLComponent } from './html-component.class';
import { htmlToPdfBuffer } from '../../../utils/pdf/puppeteer';

export type InformePdfOptions = {
    format?: 'A4' | 'Letter';
    margin?: {
        top?: string; // tamaño del header
        right?: string;
        bottom?: string; // tamaño del footer
        left?: string;
    };
    landscape?: boolean;
};

export class InformePDF extends HTMLComponent {

    header: HTMLComponent;
    body: HTMLComponent;
    footer: HTMLComponent;
    firma?: HTMLComponent; // firma de profesional
    style: string;
    stylesUrl: string[];


    wrapTemplate(innerHtml: string, css: string) {
        /*  Puppeteer requiere que header/footer sean “un solo nodo"
            por eso se envuelve el html en un div y se incluye el css para que se aplique a header/footer
        */
        return `
            <div style="width: 100%;">
                ${css ? `<style>${css}</style>` : ''}
                ${innerHtml || '<span></span>'}
            </div>
        `.trim();
    }

    buildBodyHtml(css: string, body: string) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${css ? `<style>${css}</style>` : ''}
            </head>
            <body>
                ${body || ''}
                </body>
                </html>
                `.trim();
    }

    async informe(options: InformePdfOptions = null): Promise<Buffer> {
        // asegura que this.data tenga header/footer/body/css
        await this.process();

        const opciones = { ...this.getDefaultOptions(), ...(options || {}) };
        const css = this.data?.css || '';

        const headerTemplate = this.wrapTemplate(this.data?.header, css);
        const footerTemplate = this.wrapTemplate(this.data?.footer, css);
        const bodyHtml = this.buildBodyHtml(css, this.data?.body);

        return htmlToPdfBuffer(bodyHtml, {
            format: (opciones?.format as any) || 'A4',
            margin: opciones.margin,
            landscape: opciones?.landscape || false,
            headerTemplate,
            footerTemplate,
            printBackground: true,
            preferCSSPageSize: true,
            timeoutMs: 180000
        });
    }

    public async process() {
        const data: any = {};
        if (this.header) {
            data.header = await this.header.render();
        }
        if (this.footer) {
            data.footer = await this.footer.render();
        }
        if (this.firma) {
            data.firma = await this.firma.render();
        }
        data.body = await this.body.render();

        if (this.style) {
            data.css = this.style;
        } else if (this.stylesUrl?.length > 0) {
            data.css = this.renderSCSS();
        }
        this.data = data;
    }

    private renderSCSS() {
        const styles = this.stylesUrl.map((file) => {
            return scss.renderSync({
                file
            }).css;
        });

        return styles.join('\n');
    }


    private getDefaultOptions() {
        const defaultOptions: InformePdfOptions = {
            format: 'A4',
            margin: {
                // por defecto 0, unidades: mm, cm, in, px
                top: '7cm',
                right: '0cm',
                bottom: '3.5cm',
                left: '0cm'
            }
        };

        return defaultOptions;
    }
}


export function getAssetsURL(filename) {
    return path.join(process.cwd(), filename);
}

export function loadImage(filename) {
    const realPath = path.join(process.cwd(), filename);
    const image = fs.readFileSync(realPath);
    return image.toString('base64');
}
