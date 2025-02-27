export class Ok<T> {
  public readonly ok: true = true;
  constructor(public readonly value: T) {}

  assert(): T {
    return this.value;
  }

  ifOk(func: (value: T) => void): Ok<T> {
    func(this.value);
    return this;
  }

  map<X>(func: (value: T) => X): Ok<X> {
    return ok(func(this.value));
  }

  or(other: Result<any>): Ok<T> {
    return this;
  }

  default<X>(other: X): T {
    return this.value;
  }

  and<X, Y>(other: Result<X>, func: (a: T, b: X) => Y): Result<Y> {
    return other.map((otherValue) => func(this.value, otherValue));
  }
}

export function ok<T>(value: T) {
  return new Ok(value);
}

export class Err {
  public readonly ok: false = false;
  constructor(public readonly error: string) {}

  assert(): never {
    throw this.error;
  }

  ifOk(func: (value: never) => void): Err {
    return this;
  }

  map(func: (value: never) => any): Err {
    return this;
  }

  or<X>(other: Result<X>): Result<X> {
    return other;
  }

  default<X>(other: X): X {
    return other;
  }

  and(other: Result<any>, func: (a: any, b: any) => any): Err {
    return this;
  }
}

export function err(error: string) {
  return new Err(error);
}

export type Result<T> = Ok<T> | Err;
