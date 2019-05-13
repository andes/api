import {
    Client
} from 'elasticsearch';
import * as configPrivate from '../config.private';

export class ElasticSync {
    private connElastic;
    private INDEX = 'andes';
    private TYPE = 'paciente';

    constructor() {
        // tslint:disable-next-line:no-console
        console.warn('Deprecation warning: ElasticSync is deprecated. Use PacienteTx');
        this.connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });
    }

    // [Deprecated]
    public sync(paciente) {
        const nuevoPac = JSON.parse(JSON.stringify(paciente));
        delete nuevoPac._id;
        delete nuevoPac.relaciones;
        delete nuevoPac.direccion;
        return this._sync(paciente._id.toString(), nuevoPac);
    }

    public _sync(id, data) {
        return new Promise((resolve, reject) => {
            this.search({
                q: '_id:' + id
            }).then((body) => {
                const hits = body.hits.hits;
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
            searchObj['index'] = this.INDEX;
        } else {
            searchObj = {
                index: this.INDEX,
                body: query
            };
        }

        return this.connElastic.search(searchObj);
    }

    public searchMultipleFields(query) {
        let searchObj = {};
        if (query) {
            let must = [];
            const terms = {};

            for (let key in query) {
                const match = {};
                if (key === 'claveBlocking') {
                    terms[key] = query[key].map(s => s.toLowerCase());
                    must.push({ terms });
                } else {
                    match[key] = query[key];
                    must.push({ match });
                }
            }
            searchObj = {
                index: this.INDEX,
                size: 1000,
                body: {
                    query: {
                        bool: {
                            must
                        }
                    }
                }
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
            }, (error, response) => {
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
                // tslint:disable-next-line:no-console
                console.error(error);
                reject(error);
            }
        });
    }

    public delete(id) {
        return new Promise((resolve, reject) => {
            this.connElastic.delete({
                index: this.INDEX,
                type: this.TYPE,
                refresh: true,
                id
            }, (error, response) => {
                if (error) {
                    reject(error);
                }
                resolve(true);
            });
        });
    }

    public async scroll(scrollCfg) {
        return await this.connElastic.scroll(scrollCfg);
    }

    public async searchScroll() {
        return await this.connElastic.search({
            index: this.INDEX,
            type: this.TYPE,
            scroll: '1m',
            size: '100',
            body: {
                query: {
                    match_all: {}
                },
                _source: false
            }
        });
    }
}
