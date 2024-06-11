// L5-typecheck
// ========================================================
import { equals, map, zipWith,flatten } from 'ramda';
import { isAppExp, isBoolExp, isDefineExp, isIfExp, isLetrecExp, isLetExp, isNumExp,
         isPrimOp, isProcExp, isProgram, isStrExp, isVarRef, parseL5Exp, unparse,
         AppExp, BoolExp, DefineExp, Exp, IfExp, LetrecExp, LetExp, NumExp,
         Parsed, PrimOp, ProcExp, Program, StrExp, UnionTExp,makeNumExp,parseL5 } from "./L5-ast";
import { applyTEnv, makeEmptyTEnv, makeExtendTEnv, TEnv } from "./TEnv";
import { isProcTExp, makeBoolTExp, makeNumTExp, makeProcTExp, makeStrTExp, makeVoidTExp,
         parseTE, unparseTExp,
         BoolTExp, NumTExp, StrTExp, TExp, VoidTExp,isUnionTExp,parseUnion,makeUnionTExp,isAtomicTExp,isNumTExp,isBoolTExp,isStrTExp,isTVar,isCompoundTExp,} from "./TExp";
import { isEmpty, allT, first, rest, NonEmptyList, List, isNonEmptyList, second } from '../shared/list';
import { Result, makeFailure, bind, makeOk, zipWithResult } from '../shared/result';
import { parse as p } from "../shared/parser";
import { format } from '../shared/format';
import { mapv } from '../shared/optional';
import { ok } from 'assert';

// TODO L51
// Purpose: Check that type expressions are compatible
// as part of a fully-annotated type check process of exp.
// Return an error if te1 is not compatible with te2 - true otherwise.
// Exp is only passed for documentation purposes.
export const checkCompatibleType = (te1: TExp, te2: TExp, exp: Exp): Result<true> =>
  equals(te1, te2) ? makeOk(true) :
  checkCompatibleTypeExtend(te1,te2,exp);
            
export const createError = (te1: TExp, te2: TExp, exp: Exp): Result<true> =>
    bind(unparseTExp(te1), (te1: string) =>
    bind(unparseTExp(te2), (te2: string) =>
        bind(unparse(exp), (exp: string) => 
            makeFailure(`Incompatible types: ${te1} and ${te2} in ${exp}`))));


export const checkAtomic = (te1: TExp, te2: TExp): boolean =>
{
    if(isNumTExp(te1)&& isNumTExp(te2)) return true;
    if(isBoolTExp(te1)&& isBoolTExp(te2))return true;
    if(isStrTExp(te1)&& isStrTExp(te2))return true;
    return false;
}

export const procInpar= (te1: TExp, te2: TExp): boolean =>
{
    if(isProcTExp(te1) && isProcTExp(te2))
    {
        const subParams = te1.paramTEs.filter((param)=> 
        te2.paramTEs.map((param2)=> checkCompatibleType(param,param2,makeNumExp(2))));
        const subReturn = checkCompatibleType(te1.returnTE,te2.returnTE,makeNumExp(2));
        if(subReturn.tag === "Ok")
        {
            if(subParams.length === te1.paramTEs.length && subReturn.value===true && te1.paramTEs.length === te2.paramTEs.length)
                return true;
        }
        
        return false;

    }
    return false;

}
export const ProcTExpCheck = (te1: TExp, te2: TExp): boolean =>
{
    if(isProcTExp(te1) && isProcTExp(te2))
    {
        const subParams = te2.paramTEs.filter((param)=> procInpar(te1,param));
        return subParams.length === te2.paramTEs.length;
    }
    return false;
}


export const checkCompatibleTypeExtend = (te1: TExp, te2: TExp, exp: Exp): Result<true> =>
{
    if (isAtomicTExp(te1) && isAtomicTExp(te2))
    {
        if(checkAtomic(te1, te2)) return makeOk(true);
        else
            return createError(te1,te2,exp);
    }

    if((isTVar(te1) && isTVar(te2)))
    {
        if(equals(te1, te2)) return makeOk(true);
        else
            return createError(te1,te2,exp);
    }
    
    if (isAtomicTExp(te1) && isUnionTExp(te2))
    {
        const sub = te2.components.filter((te)=> checkAtomic(te,te1)=== true);
        if(sub.length>0) return makeOk(true);
        else
            return makeFailure("T1 is not a sub of T2");
    }
    if (isUnionTExp(te1) && isUnionTExp(te2))
    {
        const sub = te1.components.filter((te)=> 
                     te2.components.map((te3)=> checkAtomic(te,te3)=== true || equals(te, te3)));


        if(sub.length === te1.components.length && te1.components.length <= te2.components.length) return makeOk(true);
        else
            return makeFailure("T1 is not a sub of T2");
    }

    if (isTVar(te1) && isUnionTExp(te2))
    {
        const sub = te2.components.map((te)=> equals(te, te2))
        if(sub.length>0) return makeOk(true);
        else
            return makeFailure("T1 is not a sub of T2");
    }

    if(isProcTExp(te1) && isProcTExp(te2))
    {
        if(ProcTExpCheck(te1,te2))return makeOk(true);
        else
        return makeFailure("T1 is not a sub of T2");
    }
    return makeFailure("T1 is not a sub of T2");

}
// Compute the type of L5 AST exps to TE
// ===============================================
// Compute a Typed-L5 AST exp to a Texp on the basis
// of its structure and the annotations it contains.

// Purpose: Compute the type of a concrete fully-typed expression
export const L5typeof = (concreteExp: string): Result<string> =>
    bind(p(concreteExp), (x) =>
        bind(parseL5Exp(x), (e: Exp) => 
            bind(typeofExp(e, makeEmptyTEnv()), unparseTExp)));

export const L5typeofProgram = (concreteProgram: string): Result<string> =>
    bind(parseL5(concreteProgram), (e: Program) => 
        bind(typeofProgram(e, makeEmptyTEnv()), unparseTExp));



// Purpose: Compute the type of an expression
// Traverse the AST and check the type according to the exp type.
// We assume that all variables and procedures have been explicitly typed in the program.
export const typeofExp = (exp: Parsed, tenv: TEnv): Result<TExp> =>
    isNumExp(exp) ? makeOk(typeofNum(exp)) :
    isBoolExp(exp) ? makeOk(typeofBool(exp)) :
    isStrExp(exp) ? makeOk(typeofStr(exp)) :
    isPrimOp(exp) ? typeofPrim(exp) :
    isVarRef(exp) ? applyTEnv(tenv, exp.var) :
    isIfExp(exp) ? typeofIf(exp, tenv) :
    isProcExp(exp) ? typeofProc(exp, tenv) :
    isAppExp(exp) ? typeofApp(exp, tenv) :
    isLetExp(exp) ? typeofLet(exp, tenv) :
    isUnionTExp(exp) ? typeofUnion(exp, tenv) :
    isLetrecExp(exp) ? typeofLetrec(exp, tenv) :
    isDefineExp(exp) ? typeofDefine(exp, tenv) :
    isProgram(exp) ? typeofProgram(exp, tenv) :
    makeFailure(`Unknown type: ${format(exp)}`);

// Purpose: Compute the type of a sequence of expressions
// Check all the exps in a sequence - return type of last.
// Pre-conditions: exps is not empty.
export const typeofExps = (exps: List<Exp>, tenv: TEnv): Result<TExp> =>
    isNonEmptyList<Exp>(exps) ? 
        isEmpty(rest(exps)) ? typeofExp(first(exps), tenv) :
        bind(typeofExp(first(exps), tenv), _ => typeofExps(rest(exps), tenv)) :
    makeFailure(`Unexpected empty list of expressions`);

export const typeofUnion = (exps: UnionTExp, tenv: TEnv): Result<TExp> =>
{
    if(exps.components.length ===1)
        return makeOk(exps.components[0]);

    return makeOk(exps);
}


// a number literal has type num-te
export const typeofNum = (n: NumExp): NumTExp => makeNumTExp();

// a boolean literal has type bool-te
export const typeofBool = (b: BoolExp): BoolTExp => makeBoolTExp();

// a string literal has type str-te
const typeofStr = (s: StrExp): StrTExp => makeStrTExp();

// primitive ops have known proc-te types
const numOpTExp = parseTE('(number * number -> number)');
const numCompTExp = parseTE('(number * number -> boolean)');
const boolOpTExp = parseTE('(boolean * boolean -> boolean)');

// Todo: cons, car, cdr, list
export const typeofPrim = (p: PrimOp): Result<TExp> =>
    (p.op === '+') ? numOpTExp :
    (p.op === '-') ? numOpTExp :
    (p.op === '*') ? numOpTExp :
    (p.op === '/') ? numOpTExp :
    (p.op === 'and') ? boolOpTExp :
    (p.op === 'or') ? boolOpTExp :
    (p.op === '>') ? numCompTExp :
    (p.op === '<') ? numCompTExp :
    (p.op === '=') ? numCompTExp :
    // Important to use a different signature for each op with a TVar to avoid capture
    (p.op === 'number?') ? parseTE('(T -> boolean)') :
    (p.op === 'boolean?') ? parseTE('(T -> boolean)') :
    (p.op === 'string?') ? parseTE('(T -> boolean)') :
    (p.op === 'list?') ? parseTE('(T -> boolean)') :
    (p.op === 'pair?') ? parseTE('(T -> boolean)') :
    (p.op === 'symbol?') ? parseTE('(T -> boolean)') :
    (p.op === 'not') ? parseTE('(boolean -> boolean)') :
    (p.op === 'eq?') ? parseTE('(T1 * T2 -> boolean)') :
    (p.op === 'string=?') ? parseTE('(T1 * T2 -> boolean)') :
    (p.op === 'display') ? parseTE('(T -> void)') :
    (p.op === 'newline') ? parseTE('(Empty -> void)') :
    makeFailure(`Primitive not yet implemented: ${p.op}`);

export const createListFromStr = (str: string,): string[] =>
{
    const words: string[] = str.replace(/[()]/g, "").split(" ");
    //const formattedWords: string[] = words.map(word => word + "");
    return words.filter(word => word != " ");
}

// TODO L51
export const makeUnion = (te1: TExp, te2: TExp): Result<TExp> =>
{
    return bind(unparseTExp(te1),(first:string)=>
    bind(unparseTExp(te2),(second:string)=>
    parseUnion([createListFromStr(first),createListFromStr(second)])));
    //return makeUnionTExp([te1,te2]);
}

    // Replace return type and body with appropriate code.
 

// TODO L51
// Purpose: compute the type of an if-exp
// Typing rule:
//   if type<test>(tenv) = boolean
//      type<then>(tenv) = t1
//      type<else>(tenv) = t1
// then type<(if test then else)>(tenv) = t1
export const typeofIf = (ifExp: IfExp, tenv: TEnv): Result<TExp> => 
{
    const testTE = typeofExp(ifExp.test, tenv);
    const thenTE = typeofExp(ifExp.then, tenv);
    const altTE = typeofExp(ifExp.alt, tenv);
    const constraint1 = bind(testTE, testTE => checkCompatibleType(testTE, makeBoolTExp(), ifExp));
    const constraint3 = bind(thenTE, (thenTE: TExp) =>
                        bind(altTE, (altTE: TExp) =>
                        checkCompatibleType(altTE, thenTE, ifExp)));

    if(constraint1.tag ==="Failure")
        return makeFailure("failure");

    if (constraint3.tag === "Ok")
        return thenTE;


    const constraint2 = bind(thenTE, (thenTE: TExp) =>
                        bind(altTE, (altTE: TExp) =>
                        (makeUnion(thenTE, altTE))));
    
    
    return bind(constraint1, (_c1: true) =>constraint2);
};

// Purpose: compute the type of a proc-exp
// Typing rule:
// If   type<body>(extend-tenv(x1=t1,...,xn=tn; tenv)) = t
// then type<lambda (x1:t1,...,xn:tn) : t exp)>(tenv) = (t1 * ... * tn -> t)
export const typeofProc = (proc: ProcExp, tenv: TEnv): Result<TExp> => {
    const argsTEs = map((vd) => vd.texp, proc.args);
    const extTEnv = makeExtendTEnv(map((vd) => vd.var, proc.args), argsTEs, tenv);
    const constraint1 = bind(typeofExps(proc.body, extTEnv), (body: TExp) => 
                            checkCompatibleType(body, proc.returnTE, proc));
    return bind(constraint1, _ => makeOk(makeProcTExp(argsTEs, proc.returnTE)));
};

// Purpose: compute the type of an app-exp
// Typing rule:
// If   type<rator>(tenv) = (t1*..*tn -> t)
//      type<rand1>(tenv) = t1
//      ...
//      type<randn>(tenv) = tn
// then type<(rator rand1...randn)>(tenv) = t
// We also check the correct number of arguments is passed.
export const typeofApp = (app: AppExp, tenv: TEnv): Result<TExp> =>

    
    bind(typeofExp(app.rator, tenv), (ratorTE: TExp) => {
        if (! isProcTExp(ratorTE)) {
            return bind(unparseTExp(ratorTE), (rator: string) =>
                        bind(unparse(app), (exp: string) =>
                            makeFailure<TExp>(`Application of non-procedure: ${rator} in ${exp}`)));
        }
        if (app.rands.length !== ratorTE.paramTEs.length) {
            return bind(unparse(app), (exp: string) => makeFailure<TExp>(`Wrong parameter numbers passed to proc: ${exp}`));
        }
        const constraints = zipWithResult((rand, trand) => bind(typeofExp(rand, tenv), (typeOfRand: TExp) => 
                                                                checkCompatibleType(typeOfRand, trand, app)),
                                          app.rands, ratorTE.paramTEs);
        return bind(constraints, _ => makeOk(ratorTE.returnTE));
    });

// Purpose: compute the type of a let-exp
// Typing rule:
// If   type<val1>(tenv) = t1
//      ...
//      type<valn>(tenv) = tn
//      type<body>(extend-tenv(var1=t1,..,varn=tn; tenv)) = t
// then type<let ((var1 val1) .. (varn valn)) body>(tenv) = t
export const typeofLet = (exp: LetExp, tenv: TEnv): Result<TExp> => {
    const vars = map((b) => b.var.var, exp.bindings);
    const vals = map((b) => b.val, exp.bindings);
    const varTEs = map((b) => b.var.texp, exp.bindings);
    const constraints = zipWithResult((varTE, val) => bind(typeofExp(val, tenv), (typeOfVal: TExp) => 
                                                            checkCompatibleType(varTE, typeOfVal, exp)),
                                      varTEs, vals);
    return bind(constraints, _ => typeofExps(exp.body, makeExtendTEnv(vars, varTEs, tenv)));
};

// Purpose: compute the type of a letrec-exp
// We make the same assumption as in L4 that letrec only binds proc values.
// Typing rule:
//   (letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)
//   tenv-body = extend-tenv(p1=(t11*..*t1n1->t1)....; tenv)
//   tenvi = extend-tenv(xi1=ti1,..,xini=tini; tenv-body)
// If   type<body1>(tenv1) = t1
//      ...
//      type<bodyn>(tenvn) = tn
//      type<body>(tenv-body) = t
// then type<(letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)>(tenv-body) = t
export const typeofLetrec = (exp: LetrecExp, tenv: TEnv): Result<TExp> => {
    const ps = map((b) => b.var.var, exp.bindings);
    const procs = map((b) => b.val, exp.bindings);
    if (! allT(isProcExp, procs))
        return makeFailure(`letrec - only support binding of procedures - ${format(exp)}`);
    const paramss = map((p) => p.args, procs);
    const bodies = map((p) => p.body, procs);
    const tijs = map((params) => map((p) => p.texp, params), paramss);
    const tis = map((proc) => proc.returnTE, procs);
    const tenvBody = makeExtendTEnv(ps, zipWith((tij, ti) => makeProcTExp(tij, ti), tijs, tis), tenv);
    const tenvIs = zipWith((params, tij) => makeExtendTEnv(map((p) => p.var, params), tij, tenvBody),
                           paramss, tijs);
    const types = zipWithResult((bodyI, tenvI) => typeofExps(bodyI, tenvI), bodies, tenvIs)
    const constraints = bind(types, (types: TExp[]) => 
                            zipWithResult((typeI, ti) => checkCompatibleType(typeI, ti, exp), types, tis));
    return bind(constraints, _ => typeofExps(exp.body, tenvBody));
};

// Typecheck a full program
// TODO L51
// TODO: Thread the TEnv (as in L1)

// Purpose: compute the type of a define
// Typing rule:
//   (define (var : texp) val)
// TODO L51 - write the true definition
export const typeofDefine = (exp: DefineExp, tenv: TEnv): Result<VoidTExp> =>
{
    const constraint = bind(typeofExp(exp.val, makeExtendTEnv([exp.var.var], [exp.var.texp], tenv)), 
                                (valTE: TExp) =>checkCompatibleType(exp.var.texp, valTE, exp));
        return bind(constraint, _ => makeOk(makeVoidTExp()));
};

// Purpose: compute the type of a program
// Typing rule:
// TODO - write the true definition
export const typeofProgram = (exp: Program, tenv: TEnv): Result<TExp> =>
    isEmpty(exp.exps) ? makeFailure("Empty program") :
    typeofProgramExps(exp.exps[0], exp.exps.slice(1), tenv);


const typeofProgramExps = (exp: Exp, exps: Exp[], tenv: TEnv): Result<TExp> => 
    isEmpty(exps) ? typeofExp(exp, tenv) :
    isDefineExp(exp) ? bind(typeofDefine(exp, tenv), 
                              _ => typeofProgramExps(exps[0], exps.slice(1), makeExtendTEnv([exp.var.var], [exp.var.texp], tenv))) :
    bind(typeofExp(exp, tenv), _ => typeofProgramExps(exps[0], exps.slice(1), tenv));
