import {Core} from './core.mjs';
import {noop, show, showf} from './internal/fn.mjs';
import {isThenable, isFunction} from './internal/is.mjs';
import {typeError, someError} from './internal/error.mjs';
import {throwInvalidArgument} from './internal/throw.mjs';

function invalidPromise(p, f){
  return typeError(
    'Future.tryP expects the function it\'s given to return a Promise/Thenable'
    + '\n  Actual: ' + show(p) + '\n  From calling: ' + showf(f)
  );
}

export function TryP(fn){
  this._fn = fn;
}

TryP.prototype = Object.create(Core);

TryP.prototype._interpret = function TryP$interpret(rec, rej, res){
  var open = true, fn = this._fn, p;
  try{
    p = fn();
  }catch(e){
    rec(someError('Future.tryP was generating its Promise', e));
    return noop;
  }
  if(!isThenable(p)){
    rec(someError('Future.tryP was generating its Promise', invalidPromise(p, fn)));
    return noop;
  }
  p.then(function TryP$res(x){
    if(open){
      open = false;
      res(x);
    }
  }, function TryP$rej(x){
    if(open){
      open = false;
      rej(x);
    }
  });
  return function TryP$cancel(){ open = false };
};

TryP.prototype.toString = function TryP$toString(){
  return 'Future.tryP(' + show(this._fn) + ')';
};

export function tryP(f){
  if(!isFunction(f)) throwInvalidArgument('Future.tryP', 0, 'be a function', f);
  return new TryP(f);
}
