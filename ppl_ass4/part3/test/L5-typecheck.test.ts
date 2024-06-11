import { isTypedArray } from 'util/types';
import { isProgram, makeIfExp, makeNumExp, parseL5, Program } from '../src/L5/L5-ast';
import { typeofProgram, L5typeof, checkCompatibleType,L5typeofProgram } from '../src/L5/L5-typecheck';
import { applyTEnv } from '../src/L5/TEnv';
import { isNumTExp, isProcTExp, makeBoolTExp, makeNumTExp, makeProcTExp, makeTVar,isUnionTExp,
         makeVoidTExp, parseTE, unparseTExp, TExp, isTExp } from '../src/L5/TExp';
import { makeOk,makeFailure, isOkT, bind, mapv, isFailure, Result } from '../src/shared/result';

describe('L5 Type Checker', () => {
    describe('parseTE', () => {
        it('parses atoms', () => {
            expect(parseTE("number")).toEqual(makeOk(makeNumTExp()));
            expect(parseTE("boolean")).toEqual(makeOk(makeBoolTExp()));
            expect(parseTE("number")).toEqual(makeOk(makeNumTExp()));
        });

        it('parses type variables', () => {
            expect(parseTE("T1")).toEqual(makeOk(makeTVar("T1")));
        });

        it('parses procedures', () => {
            expect(parseTE("(number -> (number -> number))")).toEqual(
                makeOk(makeProcTExp([makeNumTExp()], makeProcTExp([makeNumTExp()], makeNumTExp())))
            );
        });

        it('parses "void" and "Empty"', () => {
            expect(parseTE("void")).toEqual(makeOk(makeVoidTExp()));
            expect(parseTE("(Empty -> void)")).toEqual(makeOk(makeProcTExp([], makeVoidTExp())));
        });
    });

    describe('unparseTExp', () => {
        it('unparses atoms', () => {
            expect(unparseTExp(makeNumTExp())).toEqual(makeOk("number"));
            expect(unparseTExp(makeBoolTExp())).toEqual(makeOk("boolean"));
        });

        it('unparses type variables', () => {
            expect(unparseTExp(makeTVar("T1"))).toEqual(makeOk("T1"));
        });

        it('unparses procedures', () => {
            expect(unparseTExp(makeProcTExp([makeTVar("T"), makeTVar("T")], makeBoolTExp()))).toEqual(makeOk("(T * T -> boolean)"));
            expect(unparseTExp(makeProcTExp([makeNumTExp()], makeProcTExp([makeNumTExp()], makeNumTExp())))).toEqual(makeOk("(number -> (number -> number))"));
        });
    });

    describe('L5typeof', () => {
        it('returns the types of atoms', () => {
            expect(L5typeof("5")).toEqual(makeOk("number"));
            expect(L5typeof("#t")).toEqual(makeOk("boolean"));
        });

        it('returns the type of primitive procedures', () => {
            expect(L5typeof("+")).toEqual(makeOk("(number * number -> number)"));
            expect(L5typeof("-")).toEqual(makeOk("(number * number -> number)"));
            expect(L5typeof("*")).toEqual(makeOk("(number * number -> number)"));
            expect(L5typeof("/")).toEqual(makeOk("(number * number -> number)"));
            expect(L5typeof("=")).toEqual(makeOk("(number * number -> boolean)"));
            expect(L5typeof("<")).toEqual(makeOk("(number * number -> boolean)"));
            expect(L5typeof(">")).toEqual(makeOk("(number * number -> boolean)"));
            expect(L5typeof("not")).toEqual(makeOk("(boolean -> boolean)"));
        });

        it("returns the type of primitive op applications", () => {
            expect(L5typeof("(+ 1 2)")).toEqual(makeOk("number"));
            expect(L5typeof("(- 1 2)")).toEqual(makeOk("number"));
            expect(L5typeof("(* 1 2)")).toEqual(makeOk("number"));
            expect(L5typeof("(/ 1 2)")).toEqual(makeOk("number"));

            expect(L5typeof("(= 1 2)")).toEqual(makeOk("boolean"));
            expect(L5typeof("(< 1 2)")).toEqual(makeOk("boolean"));
            expect(L5typeof("(> 1 2)")).toEqual(makeOk("boolean"));

            expect(L5typeof("(not (< 1 2))")).toEqual(makeOk("boolean"));
        });

        it.skip('type checking of generic functions is not supported', () => {
            // All of these fail in TypeCheck because we do not support generic functions
            // They do work in Type Inference.
            expect(L5typeof("(eq? 1 2)")).toEqual(makeOk("boolean"));
            expect(L5typeof('(string=? "a" "b")')).toEqual(makeOk("boolean"));
            expect(L5typeof('(number? 1)')).toEqual(makeOk("boolean"));
            expect(L5typeof('(boolean? "a")')).toEqual(makeOk("boolean"));
            expect(L5typeof('(string? "a")')).toEqual(makeOk("boolean"));
            expect(L5typeof('(symbol? "a")')).toEqual(makeOk("boolean"));
            expect(L5typeof('(list? "a")')).toEqual(makeOk("boolean"));
            expect(L5typeof('(pair? "a")')).toEqual(makeOk("boolean"));
        });

        it('returns the type of "if" expressions', () => {
            expect(L5typeof("(if (> 1 2) 1 2)")).toEqual(makeOk("number"));
            expect(L5typeof("(if (= 1 2) #t #f)")).toEqual(makeOk("boolean"));
        });

        it('returns the type of procedures', () => {
            expect(L5typeof("(lambda ((x : number)) : number x)")).toEqual(makeOk("(number -> number)"));
            expect(L5typeof("(lambda ((x : number)) : boolean (> x 1))")).toEqual(makeOk("(number -> boolean)"));
            expect(L5typeof("(lambda((x : number)) : (number -> number) (lambda((y : number)) : number (* y x)))")).toEqual(makeOk("(number -> (number -> number))"));
            expect(L5typeof("(lambda((f : (number -> number))) : number (f 2))")).toEqual(makeOk("((number -> number) -> number)"));
            expect(L5typeof("(lambda((x : number)) : number (let (((y : number) x)) (+ x y)))")).toEqual(makeOk("(number -> number)"));
        });

        it('returns the type of "let" expressions', () => {
            expect(L5typeof("(let (((x : number) 1)) (* x 2))")).toEqual(makeOk("number"));
            expect(L5typeof("(let (((x : number) 1) ((y : number) 3)) (+ x y))")).toEqual(makeOk("number"));
            expect(L5typeof("(let (((x : number) 1) ((y : number) 2)) (lambda((a : number)) : number (+ (* x a) y)))")).toEqual(makeOk("(number -> number)"));
        });

        it('returns the type of "letrec" expressions', () => {
            expect(L5typeof("(letrec (((p1 : (number -> number)) (lambda((x : number)) : number (* x x)))) p1)")).toEqual(makeOk("(number -> number)"));
            expect(L5typeof("(letrec (((p1 : (number -> number)) (lambda((x : number)) : number (* x x)))) (p1 2))")).toEqual(makeOk("number"));
            expect(L5typeof(`
                (letrec (((odd? : (number -> boolean)) (lambda((n : number)) : boolean (if (= n 0) #f (even? (- n 1)))))
                         ((even? : (number -> boolean)) (lambda((n : number)) : boolean (if (= n 0) #t (odd? (- n 1))))))
                  (odd? 12))`)).toEqual(makeOk("boolean"));
        });

        it('returns "void" as the type of "define" expressions', () => {
            expect(L5typeof("(define (foo : number) 5)")).toEqual(makeOk("void"));
            expect(L5typeof("(define (foo : (number * number -> number)) (lambda((x : number) (y : number)) : number (+ x y)))")).toEqual(makeOk("void"));
            expect(L5typeof("(define (x : (Empty -> number)) (lambda () : number 1))")).toEqual(makeOk("void"));
        });

        it.skip('returns "literal" as the type for literal expressions', () => {
            expect(L5typeof("(quote ())")).toEqual(makeOk("literal"));
        });
	});



    describe("L5 Typecheck program with define", () => 
    {
        it("L5 Typecheck program", () => {
          expect(L5typeofProgram("(L5 (define (x : number) 5) (+ x 1))")).toEqual(
            makeOk("number")
          );
        });
      });

    // TODO L51 Test checkCompatibleType with unions
    describe('L5 Test checkCompatibleType with unions', () => 
    {
        it('L5 Test checkCompatibleType with union 1', () => 
        {

            const c  = bind(parseTE("(union boolean number)"),(te1:TExp)=>
                       bind(parseTE("number"),(te2:TExp)=>
                       checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));

        });
        it('L5 Test checkCompatibleType with union 2', () => 
        {

            const c  = bind(parseTE("number"),(te1:TExp)=>
                       bind(parseTE("number"),(te2:TExp)=>
                       checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));

        });
        it('L5 Test checkCompatibleType with union 3', () => 
        {

            const c  = bind(parseTE("(union (union string boolean) (union number string))"),(te1:TExp)=>
                       bind(parseTE("number"),(te2:TExp)=>
                       checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));

        });
        it('L5 Test checkCompatibleType with union 4', () => 
        {

            const c  = bind(parseTE("(union (union string boolean) (union number string))"),(te1:TExp)=>
                       bind(parseTE("(union number boolean)"),(te2:TExp)=>
                       checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));

        });
        it('L5 Test checkCompatibleType with union 5', () => 
        {

            const c  = bind(parseTE("(union t1 t2)"),(te1:TExp)=>
                       bind(parseTE("number"),(te2:TExp)=>
                       checkCompatibleType(te2,te1,makeNumExp(1))));

            if (c.tag === "Ok") 
            {
                expect(c.value).toEqual(false);
            }            

        });
        it('L5 Test checkCompatibleType with union 7', () => 
        {

            const c  = bind(parseTE("(union (union string boolean) (union number string))"),(te1:TExp)=>
                       bind(parseTE("(union number boolean)"),(te2:TExp)=>
                       checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));

        });
      
      
    });

    // TODO L51 Test makeUnion
    describe('L5 Test makeUnion', () => {

        it('Test makeUnion 1 ', () => 
        {
            expect(L5typeof("(union boolean number)")).toEqual(makeOk("(union boolean number)"));
        });
        it('Test makeUnion 6 ', () => 
        {
            expect(L5typeof("(union (T1 -> T1) (Empty -> T1))")).toEqual(makeOk("(union (T1 -> T1) (Empty -> T1))"));
        });
        

        it('Test makeUnion 2', () => 
        {
            expect(L5typeof("(union (union number boolean) string)")).toEqual(makeOk("(union boolean (union number string))"));
        });
        it('Test makeUnion 3', () => 
        {
            expect(L5typeof("(union number (union number boolean))")).toEqual(makeOk("(union boolean number)"));
        });
        it('Test makeUnion 4', () => 
        {
            expect(L5typeof("(union (union number boolean) (union boolean string))")).toEqual(makeOk("(union boolean (union number string))"));
        });
        
    });
    
    // TODO L51 Test typeOfIf with union in all relevant positions
    describe('L5 Test typeOfIf with union in all relevant positions', () => 
    {
        it('typeOfIf with union 1 ', () => 
        {
            expect(L5typeof("(if #t 1 #t)")).toEqual(makeOk("(union boolean number)"));
        });
        it('typeOfIf with union 2', () => 
        {
            expect(L5typeof("(if #t 1 2)")).toEqual(makeOk("number"));
        });
        it('typeOfIf with union 3', () => 
        {
            expect(L5typeof('(if #t (if #f 1 #t) "ok")')).toEqual(makeOk("(union boolean (union number string))"));
        });
        it('typeOfIf with union 4', () => 
        {
            expect(L5typeof('(if 1 2 3)')).toEqual(makeFailure("failure"));
        });
        
    });

    // TODO L51 Test checkCompatibleType with unions in arg positions of Procedures
    describe('L5 Test checkCompatibleType with unions in arg positions of Procedures', () =>
    {
        it('L5 Test checkCompatibleType with unions in arg positions of Procedures1 ', () => 
        {
            const c  = bind(parseTE("((union number boolean) -> string)"),(te1:TExp)=>
            bind(parseTE("(number -> string)"),(te2:TExp)=>
            checkCompatibleType(te2,te1,makeNumExp(1))));
            if (c.tag === "Ok") 
            {
                expect(c.value).toEqual(false);
            }            

        });

        it('L5 Test checkCompatibleType with unions in arg positions of Procedures 2 ', () => 
        {
            const c  = bind(parseTE("((number -> string) -> boolean)"),(te1:TExp)=>
            bind(parseTE("(number -> string)"),(te2:TExp)=>
            checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));   
        });


        it('L5 Test checkCompatibleType with unions in arg positions of Procedures 3', () => 
        {
            const c  = bind(parseTE("(((union number boolean) -> string) -> boolean)"),(te1:TExp)=>
            bind(parseTE("((union number boolean) -> string)"),(te2:TExp)=>
            checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));   
        });

        it('L5 Test checkCompatibleType with unions in arg positions of Procedures 4', () => 
        {
            const c  = bind(parseTE("(((union number boolean) -> string) -> boolean)"),(te1:TExp)=>
            bind(parseTE("((union number boolean) -> string)"),(te2:TExp)=>
            checkCompatibleType(te2,te1,makeNumExp(1))));
            expect(c).toEqual(makeOk(true));   
        });

    });

});
