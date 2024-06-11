import { Result, makeOk, } from '../shared/result';
import {map} from "ramda";
import {  Exp, Program, CExp, isAppExp, isBoolExp, isDefineExp, isIfExp, isNumExp, isPrimOp, isProcExp, isProgram, isVarRef, PrimOp, isStrExp } from './L31-ast';
import { valueToString } from '../imp/L3-value';

export const convExp = (exp: Exp | Program): string => 
    isNumExp(exp) ? valueToString(exp.val) :
    isBoolExp(exp) ? valueToString(exp.val) :
    isStrExp(exp) ? valueToString(exp.val) :
    isVarRef(exp) ? exp.var :
    isDefineExp(exp) ? `${exp.var.var} = ${convExp(exp.val)}` :
    isIfExp(exp) ? `(${convExp(exp.then)} if ${convExp(exp.test)} else ${convExp(exp.alt)})` :
    isPrimOp(exp) ? (exp.op == `=`)? `==` : exp.op :
    isProcExp(exp) ? `(lambda ${map((arg) => arg.var, exp.args)} : ${map(convExp,exp.body)})` :
    isAppExp(exp) ?  isPrimOp(exp.rator)? (exp.rator.op == 'not')? `(not ${map(convExp, exp.rands).join(` ${convExp(exp.rator)} `)})` :
                     `(${map(convExp, exp.rands).join(` ${convExp(exp.rator)} `)})` :
                     `${convExp(exp.rator)}(${map(convExp, exp.rands)})` :
    isProgram(exp) ? `${map(convExp, exp.exps).join(`\n`)}` :
    'error, cannot convert';


/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [Parsed | Error] => Result<string>
*/
export const l2ToPython = (exp: Exp | Program): Result<string>  => 
           makeOk(convExp(exp)) 

   

const convertPrimOp = (op : string) : string =>
    op === "=" || op === "eq?" ? "==" :
    op === "number?" ? "(lambda x : type(x) == int or type (x) == float)" :
    op === "boolean?" ? "(lambda x : type(x) == bool)" :
    op;


/*
    export const unparseL3 = (exp: Program | Exp): string =>
    isBoolExp(exp) ? valueToString(exp.val) :
    isNumExp(exp) ? valueToString(exp.val) :
    isStrExp(exp) ? valueToString(exp.val) :
    isLitExp(exp) ? unparseLitExp(exp) :
    isVarRef(exp) ? exp.var :
    isProcExp(exp) ? unparseProcExp(exp) :
    isIfExp(exp) ? `(if ${unparseL3(exp.test)} ${unparseL3(exp.then)} ${unparseL3(exp.alt)})` :
    isAppExp(exp) ? `(${unparseL3(exp.rator)} ${unparseLExps(exp.rands)})` :
    isPrimOp(exp) ? exp.op :
    isLetExp(exp) ? unparseLetExp(exp) :
    isDefineExp(exp) ? `(define ${exp.var.var} ${unparseL3(exp.val)})` :
    isProgram(exp) ? `(L3 ${unparseLExps(exp.exps)})` :
    exp; */
