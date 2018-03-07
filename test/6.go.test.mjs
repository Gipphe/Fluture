import {expect} from 'chai';
import {Future, go, of, after} from '../index.mjs';
import * as U from './util.mjs';
import * as F from './futures.mjs';

describe('go()', function(){

  it('throws TypeError when not given a function', function(){
    var xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
    var fs = xs.map(function(x){ return function(){ return go(x) } });
    fs.forEach(function(f){ return expect(f).to.throw(TypeError, /Future/) });
  });

});

describe('Go', function(){

  describe('#_interpret()', function(){

    it('crashes when the given function throws an error', function(){
      var m = go(function(){ throw U.error });
      return U.assertCrashed(m, new Error(
        'Error came up while Future.do was spawning an iterator:\n' +
        '  Intentional error for unit testing\n\n' +
        '  In: function (){ throw U.error }\n'
      ));
    });

    it('crashes when the given function does not return an interator', function(){
      var m = go(function(){ return null });
      return U.assertCrashed(m, new Error(
        'TypeError came up while Future.do about to consume the created iterator:\n' +
        '  Future.do expects its first argument to return an iterator, maybe you forgot the "*"\n' +
        '    Actual: null\n'
      ));
    });

    it('crashes when iterator.next() throws an error', function(){
      var m = go(function(){ return {next: function(){ throw U.error }} });
      return U.assertCrashed(m, new Error(
        'Error came up while Future.do was passing control to the iterator:\n' +
        '  Intentional error for unit testing\n\n' +
        '  In: function (){ throw U.error }\n'
      ));
    });

    it('crashes when the returned iterator does not return a valid iteration', function(){
      var m = go(function(){ return {next: function(){ return null }} });
      return U.assertCrashed(m, new Error(
        'TypeError came up while Future.do was obtaining the next Future:\n' +
        '  The iterator did not return a valid iteration from iterator.next()\n' +
        '    Actual: null\n'
      ));
    });

    it('crashes when the returned iterator produces something other than a Future', function(){
      var m = go(function(){ return {next: function(){ return {done: false, value: null} }} });
      return U.assertCrashed(m, new Error(
        'TypeError came up while Future.do was about to consume the next Future:\n' +
        '  Future.do expects the iterator to produce only valid Futures.\n' +
        '    Actual: null :: Null\n' +
        '    Tip: If you\'re using a generator, make sure you always yield a Future\n'
      ));
    });

    it('crashes when the yielded Future crashes', function(){
      var m = go(function*(){ yield F.crashed });
      return U.assertCrashed(m, new Error(
        'Error came up while Future.do was consuming a generated Future:\n' +
        '  Intentional error for unit testing\n\n' +
        '  In: Future(function(){ throw new Error("Intentional error for unit testing") })\n'
      ));
    });

    it('handles synchronous Futures', function(){
      return U.assertResolved(go(function*(){
        var a = yield of(1);
        var b = yield of(2);
        return a + b;
      }), 3);
    });

    it('handles asynchronous Futures', function(){
      return U.assertResolved(go(function*(){
        var a = yield after(10, 1);
        var b = yield after(10, 2);
        return a + b;
      }), 3);
    });

    it('does not mix state over multiple interpretations', function(){
      var m = go(function*(){
        var a = yield of(1);
        var b = yield after(10, 2);
        return a + b;
      });
      return Promise.all([
        U.assertResolved(m, 3),
        U.assertResolved(m, 3)
      ]);
    });

    it('is stack safe', function(){
      var gen = function*(){
        var i = 0;
        while(i < U.STACKSIZE + 1){ yield of(i++) }
        return i;
      };

      var m = go(gen);
      return U.assertResolved(m, U.STACKSIZE + 1);
    });

    it('cancels the running operation when cancelled', function(done){
      var cancel = go(function*(){
        yield of(1);
        yield Future(function(){ return function(){ return done() } });
      })._interpret(done, U.noop, U.noop);
      cancel();
    });

  });

  describe('#toString()', function(){

    it('returns the code to create the Go', function(){
      var f = function*(){};
      var m = go(f);
      var s = 'Future.do(' + (f.toString()) + ')';
      expect(m.toString()).to.equal(s);
    });

  });

});
