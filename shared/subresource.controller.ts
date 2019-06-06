import { Types, Document } from 'mongoose';
import { matchQuery } from '../packages/query-parser/queryBuilder';

export class SubresourceController {

    model: Document;
    key: string;
    filter: {};

    constructor(modelo) {
        this.model = modelo;
    }

    getSubresource(resource: Document) {
        return resource[this.key];
    }

    /**
     * Crea un objeto
     */
    public newSubresource(body) {
        const subresource = new (this.model as any)();
        subresource.set(body);
        return subresource;
    }

    /**
     * Agrega un elemento
     */

    public store(resource: Document, element) {
        let subresource = this.getSubresource(resource);
        const subs = subresource.push(element);
        return subs[subs.length - 1];
    }

    /**
    * Modifica un elemento
    */

    public update(element: Document, body) {
        element.set(body);
        return element;
    }

    /**
    * Busca un elemento
    * @returns
    */

    public findById(resource: Document, id: string | Types.ObjectId) {
        const subresource = this.getSubresource(resource);
        let element = subresource.id(id);
        return element;
    }

    /**
    * Busca los elementos que coincidan con la query
    * @returns
    */


    find(resource: Document, query: any) {
        let subresource = this.getSubresource(resource);
        if (query) {
            const contactos = subresource.filter(contacto => {
                return matchQuery(query, contacto, this.filter);
            });
            return contactos;
        } else {
            return subresource;
        }
    }

    /**
     * Elimina un subrecurso
     */

    public delete(resource: Document, element) {
        let subresource = this.getSubresource(resource);
        return subresource.filter(c => (c.id !== element.id));
    }


}
