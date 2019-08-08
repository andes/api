import * as ldapjs from 'ldapjs';
import * as configPrivate from '../config.private';
const isReachable = require('is-reachable');
const sha1Hash = require('sha1');

export async function checkPassword(user, password): Promise<any> {
    const server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
    return new Promise((resolve, reject) => {
        if (!configPrivate.auth.useLdap) {
            return resolve({ nombre: user.nombre, apellido: user.apellido });
        }
        let tempResponse: any = null;
        if (user.password === sha1Hash(password)) {
            tempResponse = {
                nombre: user.nombre,
                apellido: user.apellido
            };
        }
        isReachable(server).then(reachable => {
            if (!reachable) {
                return resolve(tempResponse);
            }
            // Conecta a LDAP
            const dn = 'uid=' + user.usuario + ',' + configPrivate.auth.ldapOU;

            const ldap = ldapjs.createClient({
                url: `ldap://${configPrivate.hosts.ldap}`,
                timeout: 4000,
                connectTimeout: 4000,
            });

            ldap.on('connectError', (err) => {
                return resolve(tempResponse);
            });
            ldap.on('error', (err) => {
                return resolve(tempResponse);
            });
            ldap.on('connect', () => {

                ldap.bind(dn, password, (err) => {
                    if (err) {
                        if (err.name === 'InvalidCredentialsError') {
                            return resolve(false);
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
                            return resolve(false);
                        }

                        searchResult.on('searchEntry', (entry) => {
                            return resolve({ nombre: entry.object.givenName, apellido: entry.object.sn });
                        });

                        searchResult.on('error', (err3) => {
                            return resolve(false);
                        });
                    });
                });
            });

        });

    });
}
