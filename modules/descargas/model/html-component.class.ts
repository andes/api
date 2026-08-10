import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';


export abstract class HTMLComponent {
    public template: string;
    public templateUrl: string;

    public data: { [key: string]: any };


    async render() {
        await this.process();
        const templateHTML = this.getTemplate();
        const template = handlebars.compile(templateHTML);
        const data = this.toPlainObject(this.data);
        return template(data);
    }

    private getTemplate() {
        if (this.template) {
            return this.template;
        } else if (this.templateUrl) {
            return fs.readFileSync(path.join(__dirname, this.templateUrl), 'utf8');
        } else {
            throw new Error('no template');
        }
    }

    private toPlainObject(value: any): any {
        if (value === null || value === undefined) {
            return value;
        }

        if (value instanceof Date) {
            return value;
        }

        if (Array.isArray(value)) {
            return value.map(item => this.toPlainObject(item));
        }

        if (typeof value.toObject === 'function') {
            return this.toPlainObject(value.toObject({
                getters: true,
                virtuals: true
            }));
        }

        if (typeof value === 'object') {
            const result: any = {};

            Object.keys(value).forEach(key => {
                result[key] = this.toPlainObject(value[key]);
            });

            return result;
        }

        return value;
    }

    public async process() { }
}
