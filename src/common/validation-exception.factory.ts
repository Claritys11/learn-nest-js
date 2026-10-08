import { BadRequestException, ValidationError } from '@nestjs/common';

export interface FieldError {
  field: string;
  message: string;
}

// class-validator mengembalikan error berbentuk pohon (nested DTO punya `children`).
// Fungsi ini meratakannya jadi list, dengan nama field berupa path: "items.0.qty".
function flattenErrors(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...ownErrors, ...flattenErrors(error.children ?? [], field)];
  });
}

// Dipanggil ValidationPipe setiap kali DTO tidak lolos validasi.
export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException({
    message: 'Validation failed',
    errors: flattenErrors(errors),
  });
}
