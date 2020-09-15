import * as ldapjs from 'ldapjs';
import * as configPrivate from '../config.private';

const isReachable = require('is-reachable');

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
                            return resolve({
                                nombre: entry.object.givenName,
                                apellido: entry.object.sn,
                                usuario: entry.object.uid,
                                documento: String(entry.object.uid),
                                email: entry.object.mail,
                                telefono: entry.object.telephoneNumber,
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
