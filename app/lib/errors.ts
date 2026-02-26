export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError { }

export class ResponseError extends AppError { }

export class ResponseTimeoutError extends ResponseError { }

export class DeviceBusyError extends AppError { }

export class FlashError extends AppError { }
