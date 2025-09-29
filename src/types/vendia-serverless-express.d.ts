declare module '@vendia/serverless-express' {
  import { Handler } from 'aws-lambda';
  import { Express } from 'express';

  interface ServerlessExpressOptions {
    app: Express;
  }

  export function configure(options: ServerlessExpressOptions): Handler;
  export default function (app: Express): Handler;
}
