import { applyDecorators } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { ApiExceptionType } from '../typing/api_exception.type';
import { ApiResponse } from 'uni-nest';

export function ErrorRes(status: HttpStatus, description: string) {
  return applyDecorators(
    ApiResponse({
      status: status,
      description: description,
      type: ApiExceptionType
    })
  );
}
