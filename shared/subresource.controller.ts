import { Types, Document } from 'mongoose';
import { MemoryQuery } from '@andes/query-builder';

export class SubresourceController {

    model: Document;
    key: string;
    filter: {};

    constructor(modelo) {
        this.model = modelo;
    }

    private getSubresource(resource: Document) {
        return resource[this.key];
    }


    /**
     * Crea un objeto
     */
    public make(body) {
        const subresource = new (this.model as any)();
        subresource.set(body);
        return subresource;
    }

    /**
     * Agrega un elemento
     */

    public store(resource: Document, element) {
        let subresource = this.getSubresource(resource);
        let index = subresource.findIndex(item => item.id === element.id);
        if (index >= 0) {
            subresource.splice(index, 1, element);
        } else {
            subresource.push(element);
        }
        return element;
    }

    /**
    * Modifica un elemento
    */

    public set(element: Document, body) {
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
                return MemoryQuery.buildQuery(query, this.filter, contacto);
            });
            return contactos;
        } else {
            return subresource;
        }
    }

    /**
     * Elimina un subrecurso
     */

    public delete(resource: Document, id: string | Types.ObjectId) {
        let subresource = this.getSubresource(resource);
        subresource = subresource.filter(c => (c.id !== id));
        resource[this.key] = subresource;
        return subresource;
    }


}
