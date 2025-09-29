// infra/infra-stack.ts
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFn = new lambdaNode.NodejsFunction(this, "WorkingDaysApiLambda", {
      entry: path.join(__dirname, "../../src/index.ts"), // handler Express
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,

      bundling: {
        externalModules: ["aws-sdk"],

        commandHooks: {
          beforeBundling(): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            // 👇 Copiar holidaysCache.json de src al bundle final
            return [
              `cp ${path.join(inputDir, "src/holidaysCache.json")} ${outputDir}/holidaysCache.json`,
            ];
          },
          beforeInstall(): string[] {
            return [];
          },
        },
      },
    });

    const api = new apigateway.LambdaRestApi(this, "WorkingDaysApiEndpoint", {
      handler: lambdaFn,
      proxy: true,
    });

    new cdk.CfnOutput(this, "WorkingDaysApiUrl", {
      value: api.url ?? "No URL",
    });
  }
}
