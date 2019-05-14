import { Client } from '@elastic/elasticsearch';
import * as configPrivate from '../../../config.private';
import { IPacienteDoc } from './paciente.interface';

/**
 * Sincroniza un paciente con ElasticSearch para su adecuado indice y posterior busqueda.
 * @class
 * @static
 */

export class PacienteTx {
    private static INDEX = 'andes';
    private static TYPE = 'paciente';

    public static getClient() {
        return new Client({
            node: configPrivate.hosts.elastic_main
        });
    }

    /**
     * Crea un paciente en ElasticSearch.
     * @param {IPacienteDoc} paciente Objeto paciente a sincronizar
     */
    public static async create(paciente: IPacienteDoc) {
        const id = paciente._id.toString();
        const body = paciente.toElastic();

        const es = this.getClient();
        const response = await es.create({
            index: this.INDEX,
            type: this.TYPE,
            id,
            body
        });
        return response.body.created;

    }

    /**
     * Borra un paciente en ElasticSearch.
     * @param {IPacienteDoc} paciente Objeto paciente a sincronizar
     * @throws Devuelve una excepcion si no existe el paciente
     */
    public static async delete(paciente: IPacienteDoc) {
        const id = paciente._id.toString();
        const es = this.getClient();
        const response = await es.delete({
            index: this.INDEX,
            type: this.TYPE,
            id
        }, { ignore: [404] });
        return response.body.result;
    }

    /**
     * Actualiza los datos de un paciente en ElasticSearch
     * @param {IPacienteDoc} paciente Objeto paciente a sincronizar
     */
    public static async update(paciente: IPacienteDoc) {
        await this.delete(paciente);
        return await this.create(paciente);
    }


    /**
     * Sincroniza un paciente en ElasticSearch
     * @param {IPacienteDoc} paciente Objeto paciente a sincronizar
     */
    public static async sync(paciente: IPacienteDoc) {
        const es = this.getClient();
        const pac = await this.find(String(paciente._id));
        if (pac) {
            return await this.update(paciente);
        } else {
            return await this.create(paciente);
        }
    }

    /**
     * Busca en ElasticSearch un paciente por ID
     * @param {string} id ID del paciente a buscar.
     */
    public static async find(id) {
        const es = this.getClient();
        const searchBody = {
            index: this.INDEX,
            q: '_id:' + String(id)
        };
        const { body } = await es.search(searchBody);
        const hits = this.hits(body);
        if (hits.length > 0) {
            return {
                ...hits[0]._source,
                _id: hits[0]._id,
                id: hits[0]._id
            };
        }
        return null;
    }

    /**
     * Busqueda de pacientes en elasticsearch
     * @param {Object} query Query de elasticsearch a realizar
     */

    public static async search(query: any) {
        const es = this.getClient();
        const searchBody = {
            index: this.INDEX,
            size: 5,
            body: query
        };
        const { body } = await es.search(searchBody);
        const hits = this.hits(body);
        return hits.map(h => {
            return {
                ...h._source,
                _id: h._id,
                id: h._id
            };
        });
    }

    /**
     * Obtien de forma segura los resultados de elasticSearch
     * @param {object} body Respuesta del metodo Search del cliente de ElasticSearch
     */

    private static hits(body) {
        if (body && body.hits && body.hits.hits) {
            const hits = body.hits.hits;
            return hits || [];
        }
        return null;
    }

    /**
     * [TODO] Implementar ScrollSearch para busquedas.
     */

}
