import {
    Client
} from 'elasticsearch';
import * as configPrivate from '../config.private';

export class ElasticSync {
    private connElastic;
    private INDEX = 'andes';
    private TYPE = 'paciente';

    constructor() {
        this.connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });
    }

    public sync(paciente) {
        let nuevoPac = JSON.parse(JSON.stringify(paciente));
        delete nuevoPac._id;
        delete nuevoPac.relaciones;
        return this._sync(paciente._id.toString(), nuevoPac);
    }

    private _sync(id, data) {
        return new Promise((resolve, reject) => {
            this.search({
                q: '_id:' + id
            }).then((body) => {
                let hits = body.hits.hits;
                if (hits.length > 0) {
                    this.update(id, data).then(() => {
                        resolve(true);
                    }).catch((error) => {
                        reject(error);
                    });
                } else {
                    this.create(id, data).then(() => {
                        resolve(false);
                    }).catch((error) => {
                        reject(error);
                    });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }

    public search(query) {
        let searchObj = {};
        if (query.q) {
            searchObj = query;
        } else {
            searchObj = {
                index: this.INDEX,
                body: query
            };
        }

        return this.connElastic.search(searchObj);
    }

    public create(id, data) {
        return new Promise((resolve, reject) => {
            this.connElastic.create({
                index: this.INDEX,
                type: this.TYPE,
                id,
                body: data
            }, function (error, response) {
                if (error) {
                    reject(error);
                }
                resolve(true);
            });
        });
    }


    public update(id, data) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.delete(id);
                await this.create(id, data);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Cambiamos este método ya que teníamos problemas con el metadata de Elastic para pacientes viejos creados con mongoconnector
    // public update(id, data) {
    //     return new Promise((resolve, reject) => {
    //         this.connElastic.update({
    //             index: this.INDEX,
    //             type: this.TYPE,
    //             id,
    //             body: {
    //                 doc: data
    //             }
    //         }, function (error, response) {
    //             if (error) {
    //                 console.log('error gros en update elastico', error, data);
    //                 reject(error);
    //             }
    //             resolve(true);
    //         });
    //     });
    // }

    public delete(id) {
        return new Promise((resolve, reject) => {
            this.connElastic.delete({
                index: this.INDEX,
                type: this.TYPE,
                refresh: true,
                id
            }, function (error, response) {
                if (error) {
                    reject(error);
                }
                resolve(true);
            });
        });
    }
}
