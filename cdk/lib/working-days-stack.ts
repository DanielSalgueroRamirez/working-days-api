// cdk/lib/working-days-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class WorkingDaysStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const entry = path.join(__dirname, '../../src/lambda.ts');

    const apiLambda = new lambdaNodejs.NodejsFunction(this, 'WorkingDaysFunction', {
      entry,
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(20),
      bundling: {
        externalModules: [], // no exclude, empaquetar todo
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            // Copy holidaysCache.json to the bundle so workingDays.ts can read it
            // NOTE: change 'cp' to 'copy' on Windows if necessary.
            return [
              `cp ${path.join(inputDir, 'src', 'holidaysCache.json')} ${path.join(outputDir, 'holidaysCache.json')}`,
            ];
          },
          beforeInstall(): string[] {
            return [];
          },
        },
      },
    });

    const api = new apigw.LambdaRestApi(this, 'WorkingDaysApi', {
      handler: apiLambda,
      proxy: true,
      restApiName: 'WorkingDaysApi',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      exportName: 'WorkingDaysApiUrl',
    });
  }
}
