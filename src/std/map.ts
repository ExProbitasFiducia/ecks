import { TypedValue } from '../ast'
import { State } from '../types'
import XBoolean from './boolean'
import XInteger from './integer'
import XOptional from './optional'

export default class XMap {
  kind = 'map'
  #value: Map<string, TypedValue>
  #keys: Map<string, TypedValue>
  readonly __keyType?: string
  readonly __valType?: string
  #state: State

  constructor (value: Array<[TypedValue, TypedValue]>, state: State) {
    const keys: Map<string, TypedValue> = new Map()
    const values: Map<string, TypedValue> = new Map()

    if (value.length > 0) {
      const [keyType, valType] = value[0].map(x => x.kind)
      this.__keyType = keyType
      this.__valType = valType
      for (const [key, val] of value) {
        if (key.kind !== keyType || val.kind !== valType) {
          throw new TypeError()
        }

        keys.set(key.__toString(), key)
        values.set(key.__toString(), val)
      }
    }

    this.#keys = keys
    this.#value = values
    this.#state = state
  }

  len (): XInteger {
    return new XInteger(this.#value.size, this.#state)
  }

  get (key: TypedValue): XOptional {
    if (this.__keyType !== undefined && key.kind !== this.__keyType) {
      throw new TypeError(`Expected a key of type ${this.__keyType}`)
    }

    return new XOptional(this.#state, this.#value.get(key.__toString()))
  }

  del (key: TypedValue): XMap {
    const targetKey = key.__toString()

    const entries: Array<[TypedValue, TypedValue]> = []
    for (const [k, val] of this.#value) {
      const key = this.#keys.get(k)
      if (key === undefined) throw new Error('Missing key')
      if (k !== targetKey) {
        entries.push([key, val])
      }
    }

    return this.__new(entries)
  }

  set (key: TypedValue, value: TypedValue): XMap {
    if (this.__keyType !== undefined && this.__keyType !== key.kind) {
      throw new TypeError(`Expected key of type ${this.__keyType}`)
    }

    if (this.__valType !== undefined && this.__valType !== value.kind) {
      throw new TypeError(`Expected value of type ${this.__valType}`)
    }

    const entries: Array<[TypedValue, TypedValue]> = []
    for (const [k, val] of this.#value) {
      const key = this.#keys.get(k)
      if (key === undefined) throw new Error('Missing key')
      entries.push([key, val])
    }
    entries.push([key, value])

    return this.__new(entries)
  }

  [Symbol.for('=')] (value: TypedValue): XBoolean {
    if (!(value instanceof XMap)) throw new TypeError('Expected map')

    // TypeScript bug: Symbols cannot be used to index class
    // Ref: https://github.com/microsoft/TypeScript/issues/38009
    interface EqOperand { [key: symbol]: (r: any) => XBoolean }

    let isEqual = true
    for (const [k, v] of this.#value) {
      const val = value.__value.get(k)
      if (
        val === undefined ||
        !((v as object) as EqOperand)[Symbol.for('=')](val).__value
      ) {
        isEqual = false
        break
      }
    }

    return new XBoolean(isEqual, this.#state)
  }

  [Symbol.for('+')] (value: TypedValue): XMap {
    if (!(value instanceof XMap)) throw new TypeError('Expected map')

    if (this.__length === 0) return value
    if (value.__length === 0) return this

    if (this.__keyType !== value.__keyType) {
      throw new TypeError(`Expected keys of type ${this.__keyType ?? ''}`)
    }
    if (this.__valType !== value.__valType) {
      throw new TypeError(`Expected values of type ${this.__valType ?? ''}`)
    }

    const entries: Array<[TypedValue, TypedValue]> = []
    for (const [k, val] of this.#value) {
      const key = this.#keys.get(k)
      if (key === undefined) throw new Error('Missing key')
      entries.push([key, val])
    }
    for (const [k, val] of value.__value) {
      const key = value.__keys.get(k)
      if (key === undefined) throw new Error('Missing key')
      entries.push([key, val])
    }

    return this.__new(entries)
  }

  get __value (): Map<string, TypedValue> { return this.#value }
  get __length (): number { return this.#value.size }
  get __keys (): Map<string, TypedValue> { return this.#keys }

  __new (value: Array<[TypedValue, TypedValue]>): XMap {
    return new XMap(value, this.#state)
  }

  __toString (): string {
    const entries = Array.from(this.#value.entries()).map(([key, value]) => {
      return `${key}: ${value.__toString()}`
    }).join(', ')

    return `{${entries}}`
  }
}
