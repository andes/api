/**
 * Transform SNOMED Expression to Mongo Query (with limitations)
 * Thanks to
 *      https://github.com/IHTSDO/SNOMEDCT-Languages
 *      https://github.com/IHTSDO/sct-snapshot-rest-api
 */

let apglib = require('apg-lib');
let grammar = require('./grammar');
let id = apglib.ids;


/**
 * Make AST from SNOMED Expression string
 */

export let parseExpression = function (expression) {
    // Set basic APG Grammar

    let grammarObj = new grammar();
    let parser = new apglib.parser();
    parser.ast = new apglib.ast();
    parser.trace = new apglib.trace();

    // Parser expresssion
    var inputCharacterCodes = apglib.utils.stringToChars(expression);
    let result = parser.parse(grammarObj, 'expressionConstraint', inputCharacterCodes);

    // Create AST
    parser.ast.translate();
    let ast = parser.trace.toTree();
    return ast;
};

function exitWithError (e) {
    return e;
}


/**
 * Genera una mongo query a partir del AST de la expression

 * @param {object} ast Arbol después del parser de la expressiń
 * @param {object} options
 * @param {string} options.form Tipo de la relacion (inferred or stated).
 */

export class QueryBuilder {
    public form;
    public expression;
    public ast;
    public data;

    constructor(ast, options: any = {}) {
        this.form = options.form || 'inferred';
        this.expression = apglib.utils.charsToString(ast.string);
        this.ast = this.cleanTree(ast.tree);
        this.data = { $and: [] };
    }

    exec() {
        this.resolve(this.ast, this.data['$and']);
        return this.data;
    }

    cleanTree (item) {
        if (item.state.id !== 101 ) {
            return null;
        }
        if (item.opData === 'ws') {
            return null;
        }

        item.children = item.children.map(_item => { return this.cleanTree(_item); }).filter(_item => _item);
        return item;
    }

    readValue(node) {
        let value = this.expression.substring(node.phrase.index, node.phrase.index + node.phrase.length );
        return value;
    }

    resolve(node, queryPart) {
        let rule = node.opData;
        let value = this.expression.substring(node.phrase.index, node.phrase.index + node.phrase.length );

        if (this[rule]) {
            this[rule](node, value, queryPart);
        }

    }

    expressionConstraint(node, value, queryPart) {
        this.resolve(node.children[0], queryPart);
    }

    readAttribute (node) {
        let condition: any = {
            criteria: node.opData,
            cardinality: false,
            reverseFlag: false,
            attributeOperator: false,
            typeId: false,
            expressionComparisonOperator: false,
            targetNode: false
        };
        if (node.opData === 'attribute') {
            node.children.forEach((attrChild) => {
                if (attrChild.opData === 'attributeOperator') {
                    attrChild.children.forEach((operator) => {
                        condition.attributeOperator = operator.opData;
                    });
                } else if (attrChild.opData === 'attributeName') {
                    attrChild.children.forEach((nameChild) => {
                        if (nameChild.opData === 'wildCard') {
                            condition.typeId = '*';
                        } else if (nameChild.opData === 'conceptReference') {
                            condition.typeId = this.readValue(nameChild.children[0]);
                        }
                    });
                } else if (attrChild.opData === 'expressionComparisonOperator') {
                    condition.expressionComparisonOperator = attrChild.content;
                } else if (attrChild.opData === 'expressionConstraintValue') {
                    attrChild.children.forEach((valueChild) => {
                        // if (valueChild.opData == "simpleExpressionConstraint") {
                        condition.targetNode = valueChild;
                        // }
                    });
                } else if (attrChild.opData === 'cardinality') {
                    condition.cardinality = true;
                } else if (attrChild.opData === 'reverseFlag') {
                    condition.reverseFlag = true;
                }
            });
        }
        return condition;
    }


    readSimpleExpressionConstraint (nodes) {
        var condition: any = {
            condition: nodes.opData,
            criteria: false,
            memberOf: false,
            conceptId: false
        };
        nodes.children.forEach((child) => {
            if (child.opData === 'constraintOperator') {
                var constraintOperator = child;
                if (constraintOperator.children.length) {
                    condition.criteria = constraintOperator.children[0].opData;
                }
            } else if (child.opData === 'focusConcept') {
                var focusConcept = child;
                var focusChildren = focusConcept.children;
                if (focusChildren.length) {
                    focusChildren.forEach((loopFocusChild) => {
                        if (loopFocusChild.opData === 'conceptReference') {
                            condition.conceptId = this.readValue(loopFocusChild.children[0]);
                        } else if (loopFocusChild.opData === 'memberOf') {
                            condition.memberOf = true;
                        } else if (loopFocusChild.opData === 'wildCard') {
                            condition.criteria = loopFocusChild.opData;
                        }
                    });
                }
            }
        });
        if (!condition.criteria) {
            condition.criteria = 'self';
        }

        return condition;
    }

    simpleExpressionConstraint(node, value, queryPart) {
        node.condition = this.readSimpleExpressionConstraint(node);

        if (node.condition.memberOf) {
            queryPart.push({'memberships.refset.conceptId': node.condition.conceptId});
            if (node.condition.criteria && node.condition.criteria !== 'self') {
                exitWithError('Unsupported condition: combined memberOf and hierarchy criteria');
            }
        } else if (node.condition.criteria === 'self') {
            queryPart.push({'conceptId': node.condition.conceptId});
        } else if (node.condition.criteria === 'descendantOf') {
            if (this.form === 'stated') {
                queryPart.push({'statedAncestors': node.condition.conceptId});
            } else {
                queryPart.push({'inferredAncestors': node.condition.conceptId});
            }
        } else if (node.condition.criteria === 'descendantOrSelfOf') {
            var or = {$or: []};
            or['$or'].push({'conceptId': node.condition.conceptId});
            if (this.form === 'stated') {
                or['$or'].push({'statedAncestors': node.condition.conceptId});
            } else {
                or['$or'].push({'inferredAncestors': node.condition.conceptId});
            }
            queryPart.push(or);
        } else if (node.condition.criteria === 'ancestorOf') {
            // Not supported right now
            exitWithError('Unsupported condition: ' + node. condition.criteria);
        } else if (node.condition.criteria === 'ancestorOrSelfOf') {
            queryPart.push({'conceptId': node.condition.conceptId});
            // Not supported right now
            exitWithError('Unsupported condition: ' + node.condition.criteria);
        }

    }

    compoundExpressionConstraint (node, value, queryPart) {
        this.resolve(node.children[0], queryPart);
    }

    subExpressionConstraint (node, value, queryPart) {
        this.resolve(node.children[0], queryPart);
    }

    exclusionExpressionConstraint (node, value, queryPart) {
        var children = node.children;
        if (children.length !== 3) {
            exitWithError('Problem with exclusionExpressionConstraint: ' + node.content);
        }
        // var excl = {$and:[]};
        var excl = queryPart;
        this.resolve(children[0], excl);

        var nor = [];
        this.resolve(children[2], nor);

        var not = { $nor: nor };
        queryPart.push(not);
    }

    disjunctionExpressionConstraint (node, value, queryPart) {
        var or = {$or: []};
        node.children.forEach((child) => {
            if (child.opData === 'subExpressionConstraint') {
                this.resolve(child, or['$or']);
            }
        });
        queryPart.push(or);
    }

    conjunctionExpressionConstraint (node, value, queryPart) {
        var and = {$and: []};
        node.children.forEach((child) => {
            if (child.opData === 'subExpressionConstraint') {
                this.resolve(child, and['$and']);
            }
        });
        queryPart.push(and);
    }

    refinedExpressionConstraint (node, value, queryPart) {
        var children = node.children;
        if (children.length !== 2) {
            exitWithError('Problem with refinedExpressionConstraint: ' + node.content);
        }
        // var and = {$and:[]};
        this.resolve(children[0], queryPart);
        this.resolve(children[1], queryPart);
        // queryPart.push(and);
    }

    refinement (node, value, queryPart) {
        var children = node.children;
        if (children.length === 1) {
            this.resolve(children[0], queryPart);
        } else {
            if (children[1].opData === 'conjunctionRefinementSet') {
                var and = { $and: [] };
                this.resolve(children[0], and['$and']);
                this.resolve(children[1], and['$and']);
                queryPart.push(and);
            } else if (children[1].opData === 'disjunctionRefinementSet') {
                var or = { $or: [] };
                this.resolve(children[0], or['$or']);
                this.resolve(children[1], or['$or']);
                queryPart.push(or);
            }
        }
    }

    disjunctionRefinementSet (node, value, queryPart) {
        var or = { $or: [] };
        node.children.forEach((child) => {
            if (child.opData === 'subRefinement') {
                this.resolve(child, or['$or']);
            }
        });
        queryPart.push(or);
    }

    conjunctionRefinementSet (node, value, queryPart) {
        var and = { $and: [] };
        node.children.forEach((child) => {
            if (child.opData === 'subRefinement') {
                this.resolve(child, and['$and']);
            }
        });
        queryPart.push(and);
    }

    subRefinement (node, value, queryPart) {
        // var or = {$or:[]};
        node.children.forEach((child) => {
            this.resolve(child, queryPart);
        });
        // queryPart.push(or);
    }

    attributeSet (node, value, queryPart) {
        var children = node.children;
        if (children.length === 1) {
            this.resolve(children[0], queryPart);
        } else {
            if (children[1].opData === 'conjunctionAttributeSet') {
                var and = {$and: []};
                this.resolve(children[0], and['$and']);
                this.resolve(children[1], and['$and']);
                queryPart.push(and);
            } else if (children[1].opData === 'disjunctionAttributeSet') {
                var or = {$or: []};
                this.resolve(children[0], or['$or']);
                this.resolve(children[1], or['$or']);
                queryPart.push(or);
            }
        }
    }

    conjunctionAttributeSet (node, value, queryPart) {
        var and = {$and: []};
        node.children.forEach((child) => {
            if (child.opData === 'subAttributeSet') {
                this.resolve(child, and['$and']);
            }
        });
        queryPart.push(and);
    }

    disjunctionAttributeSet (node, value, queryPart) {
        var or = { $or: [] };
        node.children.forEach((child) => {
            if (child.opData === 'subAttributeSet') {
                this.resolve(child, or['$or']);
            }
        });
        queryPart.push(or);
    }

    subAttributeSet (node, value, queryPart) {
        // var or = {$or:[]};
        node.children.forEach((child) => {
            if (child.opData === 'attribute' || child.opData === 'attributeSet') {
                this.resolve(child, queryPart);
            }
        });
        // queryPart.push(or);
    }

    attributeGroup (node, value, queryPart) {
        // TODO: Implement cardinality
        var or = { $or: [] };
        node.children.forEach((child) => {
            if (child.opData === 'attributeSet') {
                this.resolve(child, or['$or']);
            }
        });
        queryPart.push(or);
    }

    attribute (node, ast, queryPart) {
        var elemMatch = {};
        var condition = this.readAttribute(node);
        // Process attribute name
        var attributeNameResults = false;
        if (condition.cardinality) {
            exitWithError('Unsupported condition: cardinality');
        }
        if (condition.reverseFlag) {
            exitWithError('Unsupported condition: reverseFlag');
        }
        if (condition.typeId !== '*') {
            if (condition.attributeOperator) {
                if (condition.attributeOperator === 'descendantOrSelfOf') {
                    elemMatch['$or'] = [];
                    elemMatch['$or'].push({'type.conceptId' : condition.conceptId});
                    elemMatch['$or'].push({'typeInferredAncestors' : condition.conceptId});
                } else if (condition.attributeOperator === 'descendantOf') {
                    elemMatch['typeInferredAncestors'] = condition.conceptId;
                } else {
                    elemMatch['type.conceptId'] = condition.typeId;
                }
            } else {
                elemMatch['type.conceptId'] = condition.typeId;
            }
        }
        // Process attribute value
        // if (condition.targetNode.content != "*") {
        //    var temp = [];
        //    computer.resolve(condition.targetNode, ast, temp;
        // }
        // queryPart.push({relationships: {"$elemMatch": elemMatch}});
        // TODO: update for nested definitions in attributes
        if (condition.targetNode) {
            if (condition.targetNode.opData === 'simpleExpressionConstraint') {
                var targetExp = this.readSimpleExpressionConstraint(condition.targetNode);

                if (targetExp.memberOf) {
                    elemMatch['targetMemberships'] = targetExp.conceptId;
                } else if (targetExp.criteria === 'descendantOrSelfOf') {
                    elemMatch['$or'] = [];
                    elemMatch['$or'].push({'destination.conceptId' : targetExp.conceptId});
                    elemMatch['$or'].push({'targetInferredAncestors' : targetExp.conceptId});
                } else if (targetExp.criteria === 'descendantOf') {
                    elemMatch['targetInferredAncestors'] = targetExp.conceptId;
                } else {
                    elemMatch['destination.conceptId'] = targetExp.conceptId;
                }
            } else {
                exitWithError('Unsupported condition: Nested definitions');
            }
        }
        if (Object.keys(elemMatch).length > 0) {
            elemMatch['active'] = true;
            queryPart.push({relationships: {'$elemMatch': elemMatch}});
        }
    }
}


/**
 * All in-one function to convert expression to mongo query
 */

export let makeMongoQuery =  function (expression) {
    let ast = parseExpression(expression);
    let builder = new QueryBuilder(ast, );
    return builder.exec();
};

/**
 * Exports de functions
 */

// var exports = module.exports = {};
// exports.makeMongoQuery = makeMongoQuery;
// exports.QueryBuilder = QueryBuilder;
// exports.parseExpression = parseExpression;

