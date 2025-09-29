"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfraStack = void 0;
// infra/infra-stack.ts
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const lambdaNode = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const path = __importStar(require("path"));
class InfraStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const lambdaFn = new lambdaNode.NodejsFunction(this, "WorkingDaysApiLambda", {
            entry: path.join(__dirname, "../../src/index.ts"), // handler Express
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_18_X,
            bundling: {
                externalModules: ["aws-sdk"],
                commandHooks: {
                    beforeBundling() {
                        return [];
                    },
                    afterBundling(inputDir, outputDir) {
                        // 👇 Copiar holidaysCache.json de src al bundle final
                        return [
                            `cp ${path.join(inputDir, "src/holidaysCache.json")} ${outputDir}/holidaysCache.json`,
                        ];
                    },
                    beforeInstall() {
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
exports.InfraStack = InfraStack;
