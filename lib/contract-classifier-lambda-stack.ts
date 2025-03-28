import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';

export class ContractClassifierLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const fn = new lambda.NodejsFunction(this, 'ContractClassifierLambda', {
      runtime: Runtime.NODEJS_18_X,
      timeout: cdk.Duration.minutes(1),
      entry: path.join(__dirname, 'lambda-handler', 'index.ts'),
    });

    const endpoint = new apigw.LambdaRestApi(this, `ContractClassifierApiGwEndpoint`, {
      handler: fn,
      restApiName: `ContractClassifierApi`,
    });
  }
}
