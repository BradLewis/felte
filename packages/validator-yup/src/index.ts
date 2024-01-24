import type { ObjectSchema, ValidationError, ValidateOptions } from 'yup';
import type {
  Obj,
  AssignableErrors,
  ValidationFunction,
  Extender,
  ExtenderHandler,
} from '@felte/common';
import { _set, CurrentForm } from '@felte/common';

export type ValidatorConfig = {
  schema: ObjectSchema<any>;
  level?: 'error' | 'warning';
  castValues?: boolean;
};

export function validateSchema<Data extends Obj>(
  schema: ObjectSchema<any>,
  options?: ValidateOptions
): ValidationFunction<Data> {
  function shapeErrors(errors: ValidationError): AssignableErrors<Data> {
    return errors.inner.reduce((err, value) => {
      /* istanbul ignore next */
      if (!value.path) return err;
      return _set(err, value.path, value.message);
    }, {} as AssignableErrors<Data>);
  }
  return async function validate(
    values: Data
  ): Promise<AssignableErrors<Data> | undefined> {
    return schema
      .validate(values, { strict: true, abortEarly: false, ...options })
      .then(() => undefined)
      .catch(shapeErrors);
  };
}

export function validator<Data extends Obj = Obj>({
  schema,
  level = 'error',
  castValues,
}: ValidatorConfig): Extender<Data> {
  return function extender(
    currentForm: CurrentForm<Data>
  ): ExtenderHandler<Data> {
    if (currentForm.stage !== 'SETUP') return {};
    const validateFn = validateSchema<Data>(schema);
    currentForm.addValidator(validateFn, { level });
    if (!castValues) return {};
    const transformFn = (values: unknown) => {
      return schema.cast(values);
    };
    currentForm.addTransformer(transformFn);
    return {};
  };
}
