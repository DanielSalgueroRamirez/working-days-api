#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WorkingDaysStack } from '../lib/working-days-stack';

const app = new cdk.App();

new WorkingDaysStack(app, 'WorkingDaysStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
