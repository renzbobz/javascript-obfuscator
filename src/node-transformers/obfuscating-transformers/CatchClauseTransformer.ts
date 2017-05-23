import { injectable, inject } from 'inversify';
import { ServiceIdentifiers } from '../../container/ServiceIdentifiers';

import * as estraverse from 'estraverse';
import * as ESTree from 'estree';

import { TObfuscatingReplacerFactory } from '../../types/container/TObfuscatingReplacerFactory';

import { IOptions } from '../../interfaces/options/IOptions';
import { IIdentifierReplacer } from '../../interfaces/node-transformers/obfuscating-transformers/IIdentifierReplacer';
import { IVisitor } from '../../interfaces/IVisitor';

import { ObfuscatingReplacers } from '../../enums/container/ObfuscatingReplacers';

import { AbstractNodeTransformer } from '../AbstractNodeTransformer';
import { Node } from '../../node/Node';

/**
 * replaces:
 *     try {} catch (e) { console.log(e); };
 *
 * on:
 *     try {} catch (_0x12d45f) { console.log(_0x12d45f); };
 *
 */
@injectable()
export class CatchClauseTransformer extends AbstractNodeTransformer {
    /**
     * @type {IIdentifierReplacer}
     */
    private readonly identifierReplacer: IIdentifierReplacer;

    /**
     * @param obfuscatingReplacerFactory
     * @param options
     */
    constructor (
        @inject(ServiceIdentifiers.Factory__IObfuscatingReplacer) obfuscatingReplacerFactory: TObfuscatingReplacerFactory,
        @inject(ServiceIdentifiers.IOptions) options: IOptions
    ) {
        super(options);

        this.identifierReplacer = <IIdentifierReplacer>obfuscatingReplacerFactory(ObfuscatingReplacers.IdentifierReplacer);
    }

    /**
     * @return {IVisitor}
     */
    public getVisitor (): IVisitor {
        return {
            enter: (node: ESTree.Node, parentNode: ESTree.Node) => {
                if (Node.isCatchClauseNode(node)) {
                    return this.transformNode(node, parentNode);
                }
            }
        };
    }

    /**
     * @param catchClauseNode
     * @param parentNode
     * @returns {ESTree.Node}
     */
    public transformNode (catchClauseNode: ESTree.CatchClause, parentNode: ESTree.Node): ESTree.Node {
        const nodeIdentifier: number = this.nodeIdentifier++;

        this.storeCatchClauseParam(catchClauseNode, nodeIdentifier);
        this.replaceCatchClauseParam(catchClauseNode, nodeIdentifier);

        return catchClauseNode;
    }

    /**
     * @param catchClauseNode
     * @param nodeIdentifier
     */
    private storeCatchClauseParam (catchClauseNode: ESTree.CatchClause, nodeIdentifier: number): void {
        if (Node.isIdentifierNode(catchClauseNode.param)) {
            this.identifierReplacer.storeNames(catchClauseNode.param.name, nodeIdentifier);
        }
    }

    /**
     * @param catchClauseNode
     * @param nodeIdentifier
     */
    private replaceCatchClauseParam (catchClauseNode: ESTree.CatchClause, nodeIdentifier: number): void {
        estraverse.replace(catchClauseNode, {
            enter: (node: ESTree.Node, parentNode: ESTree.Node): any => {
                if (Node.isReplaceableIdentifierNode(node, parentNode)) {
                    const newIdentifier: ESTree.Identifier = this.identifierReplacer.replace(node.name, nodeIdentifier);
                    const newIdentifierName: string = newIdentifier.name;

                    if (node.name !== newIdentifierName) {
                        node.name = newIdentifierName;
                        node.obfuscatedNode = true;
                    }
                }
            }
        });
    }
}