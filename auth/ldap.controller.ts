import * as ldapjs from 'ldapjs';
import * as configPrivate from '../config.private';
const isReachable = require('is-reachable');
const sha1Hash = require('sha1');

function sleep(ms) {
    return new Promise((resolve) => { setTimeout(() => resolve('timeout'), ms); });
}

export async function checkPassword(user, password): Promise<any> {
    const server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
    const ladpPromise = new Promise((resolve, reject) => {
        if (!configPrivate.auth.useLdap) {
            return resolve({ nombre: user.nombre, apellido: user.apellido });
        }

        isReachable(server).then(reachable => {
            if (!reachable) {
                return resolve('timeout');
            }
            // Conecta a LDAP
            const dn = 'uid=' + user.usuario + ',' + configPrivate.auth.ldapOU;

            const ldap = ldapjs.createClient({
                url: `ldap://${configPrivate.hosts.ldap}`,
                timeout: 4000,
                connectTimeout: 4000,
            });

            ldap.on('connectError', (err) => {
                return resolve('timeout');
            });
            ldap.on('error', (err) => {
                return resolve('timeout');
            });
            ldap.on('connect', () => {

                ldap.bind(dn, password, (err) => {
                    if (err) {
                        if (err.name === 'InvalidCredentialsError') {
                            return resolve('invalid');
                        } else {
                            return;
                        }
                    }
                    ldap.search(dn, {
                        scope: 'sub',
                        filter: '(uid=' + user.usuario + ')',
                        paged: false,
                        sizeLimit: 1
                    }, (err2, searchResult) => {
                        if (err2) {
                            return resolve('invalid');
                        }
                        searchResult.on('searchEntry', (entry) => {
                            let obj = getObjeto(entry);
                            return resolve({
                                nombre: transform(obj.givenName),
                                apellido: transform(obj.sn),
                            });
                        });

                        searchResult.on('error', (err3) => {
                            return resolve('invalid');
                        });
                    });
                });
            });

        });

    });

    const response = await Promise.race([ladpPromise, sleep(3000)]);
    if (response === 'timeout') {
        // PASSWORD CACHE
        if (user.password === sha1Hash(password)) {
            return {
                nombre: user.nombre,
                apellido: user.apellido
            };
        } else {
            return null;
        }
    } else if (response === 'invalid') {
        return null;
    } else {
        return response;
    }
}

function getObjeto(entry: any) {
    let obj = {
        dn: entry.dn.toString(),
        controls: [],
        mail: null,
        telephoneNumber: null,
        sn: Buffer,
        cn: null,
        givenName: null,
        uid: null,
        carLicense: null,
        objectClass: null
    };
    entry.attributes.forEach(
        (a) => {
            let item = a.buffers;
            if (item && item.length) {
                if (item.length > 1) {
                    obj[a.type] = item.slice();
                } else {
                    obj[a.type] = item[0];
                }
            } else {
                obj[a.type] = [];
            }
        });
    return obj;
}

function transform(input) {
    let str = JSON.stringify(input).substr(24);
    str = str.substring(0, str.length - 1);
    return (String.fromCharCode.apply(String, JSON.parse(str)));
}

export async function getUserInfo(documento): Promise<any> {
    const server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
    return new Promise((resolve, reject) => {
        return isReachable(server).then(reachable => {
            if (!reachable) {
                return reject();
            }
            // Conecta a LDAP
            const dn = 'uid=' + documento + ',' + configPrivate.auth.ldapOU;

            const ldap = ldapjs.createClient({
                url: `ldap://${configPrivate.hosts.ldap}`,
                timeout: 4000,
                connectTimeout: 4000,
            });

            ldap.on('connectError', (err) => {
                return reject();
            });
            ldap.on('error', (err) => {
                return reject();
            });
            ldap.on('connect', () => {

                ldap.bind('', '', (err) => {
                    if (err) {
                        if (err.name === 'InvalidCredentialsError') {
                            return reject();
                        } else {
                            return;
                        }
                    }
                    ldap.search(dn, {
                        scope: 'sub',
                        filter: '(uid=' + documento + ')',
                        paged: false,
                        sizeLimit: 1
                    }, (err2, searchResult) => {
                        if (err2) {
                            return reject(false);
                        }

                        searchResult.on('searchEntry', (entry) => {
                            let obj = getObjeto(entry);
                            return resolve({
                                nombre: transform(obj.givenName),
                                apellido: transform(obj.sn),
                                usuario: entry.object.uid,
                                documento: String(entry.object.uid),
                                organizaciones: []
                            });
                        });

                        searchResult.on('error', (err3) => {
                            return reject(err3);
                        });
                    });
                });
            });

        });

    });
}
