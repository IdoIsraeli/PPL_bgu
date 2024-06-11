import {  LetExp,AppExp,ElseClause,makeBoolExp,CondExp,isCondExp,CExp,Exp, makeCondExp,Program,makeCondClause,unparseL31,makeDefineExp,isProgram,makeProgram,isCExp,isExp,isDefineExp,isAtomicExp,isLitExp,isIfExp,makeIfExp,isAppExp,makeAppExp,isProcExp,makeProcExp,isLetExp, CondClause, makeLetExp, makeBinding} from "./L31-ast";
import { Result, makeFailure,makeOk,bind,mapResult } from "../shared/result";
import {map, zipWith } from "ramda";


/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>
    makeOk(rewriteAllLet(exp));


export const rewriteAllLet = (exp: Program | Exp): Program | Exp =>
    isExp(exp) ? rewriteAllLetExp(exp) :
    isProgram(exp) ? makeProgram(map(rewriteAllLetExp, exp.exps)) :
    exp;

const rewriteAllLetExp = (exp: Exp): Exp =>
    isCExp(exp) ? rewriteAllLetCExp(exp) :
    isDefineExp(exp) ? makeDefineExp(exp.var, rewriteAllLetCExp(exp.val)) :
    exp;



const rewriteAllLetCExp = (exp: CExp): CExp =>

    isAtomicExp(exp) ? exp :

    isLitExp(exp)    ? exp :
    isIfExp(exp)     ? makeIfExp(rewriteAllLetCExp(exp.test),
                             rewriteAllLetCExp(exp.then),
                             rewriteAllLetCExp(exp.alt)) :
    isAppExp(exp)    ? makeAppExp(rewriteAllLetCExp(exp.rator),
                               map(rewriteAllLetCExp, exp.rands)) :
    isProcExp(exp)   ? makeProcExp(exp.args, map(rewriteAllLetCExp, exp.body)) :

    isLetExp(exp)    ? makeLetExp(map((b)=> makeBinding(b.var.var,rewriteAllLetCExp(b.val)),exp.bindings),
                                  map(rewriteAllLetCExp,exp.body)):

    isCondExp(exp)   ? rewriteAllLetCExp(rewriteCond(exp)):
    exp;


    const rewriteCond = (exp: CondExp): CExp => 
    {
        return  recursiceCond(exp.condclauses,exp.elseclause);
    }

    const recursiceCond = (clause:CondClause[],elsec:ElseClause):CExp =>
    {
        if(clause.length == 1)
        {
            return makeIfExp(clause[0].test,
                             clause[0].then[0],
                             elsec.val[1]);
        }
        else
        {
            return makeIfExp(clause[0].test,
                             clause[0].then[0],
                             recursiceCond(clause.slice(1),elsec));
        }

    }

    


