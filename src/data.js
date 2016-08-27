/**
 * Created by keyvan on 8/16/16.
 */
import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chalk from 'chalk';
import parseNeo4jResponse from './parser';

const queryDict = {};
let driver;

const addCypherQueryFile = (cypherQueryFilePath) => {
    queryDict[cypherQueryFilePath] = fs.readFileSync(cypherQueryFilePath, 'utf8');
};

const initializeDatabase = ({boltUrl, user, password} = {}) => {
    driver = neo4j.driver(boltUrl, neo4j.auth.basic(user, password));
    const session = driver.session();
    return session.run('RETURN "Working"')
        .then(result => {
            console.log(chalk.green('Neo4j instance successfully connected.'));
            session.close();
        })
        .catch(error => {
            console.log(
                chalk.red('Error connecting to theNeo4j instance, check database arguments'));
            throw error.fields ? new Error(JSON.stringify(error.fields[0])) : error;
        });
};

const executeCypher = (cypherQueryFilePath, queryParams) => new Promise((resolve, reject) => {
    if (!queryDict[cypherQueryFilePath])
        addCypherQueryFile(cypherQueryFilePath);

    const query = queryDict[cypherQueryFilePath];
    const session = driver.session();

    session.run(query, queryParams)
        .then(result => {
            resolve(result);
            session.close();
        })
        .catch(reject);
})
    .then(parseNeo4jResponse);

class API {
    constructor({method, route, cypherQueryFile, allowedRoles = [],
                postProcess = result => result} = {}) {
        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;

        this.response = params => executeCypher(cypherQueryFile, params).then(postProcess);
    }
}

export {executeCypher, initializeDatabase};
export default API;
