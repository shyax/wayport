#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as path from "path";

class PortholeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---------------------------------------------------------------
    // Cognito User Pool — handles auth (email + OAuth)
    // ---------------------------------------------------------------
    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "porthole-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      customAttributes: {
        display_name: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // App client — used by the desktop app (PKCE flow, no secret)
    const userPoolClient = userPool.addClient("DesktopClient", {
      userPoolClientName: "porthole-desktop",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: ["porthole://auth/callback"],
        logoutUrls: ["porthole://auth/logout"],
      },
      preventUserExistenceErrors: true,
    });

    // Hosted UI domain
    const domain = userPool.addDomain("CognitoDomain", {
      cognitoDomain: { domainPrefix: "porthole-auth" },
    });

    // ---------------------------------------------------------------
    // DynamoDB — profile sync storage
    // ---------------------------------------------------------------
    const syncTable = new dynamodb.Table(this, "SyncTable", {
      tableName: "porthole-sync",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING }, // USER#<userId>
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },     // PROFILE#<id> | FOLDER#<id> | ENV#<id>
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI for workspace-level queries
    syncTable.addGlobalSecondaryIndex({
      indexName: "gsi-workspace",
      partitionKey: { name: "workspaceId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "updatedAt", type: dynamodb.AttributeType.STRING },
    });

    // ---------------------------------------------------------------
    // Lambda handlers
    // ---------------------------------------------------------------
    const commonLambdaProps: Partial<lambdaNode.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: syncTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    };

    const syncPushFn = new lambdaNode.NodejsFunction(this, "SyncPushFn", {
      ...commonLambdaProps,
      functionName: "porthole-sync-push",
      entry: path.join(__dirname, "lambda/sync-push.ts"),
    });

    const syncPullFn = new lambdaNode.NodejsFunction(this, "SyncPullFn", {
      ...commonLambdaProps,
      functionName: "porthole-sync-pull",
      entry: path.join(__dirname, "lambda/sync-pull.ts"),
    });

    const syncDeleteFn = new lambdaNode.NodejsFunction(this, "SyncDeleteFn", {
      ...commonLambdaProps,
      functionName: "porthole-sync-delete",
      entry: path.join(__dirname, "lambda/sync-delete.ts"),
    });

    // Grant DynamoDB access
    syncTable.grantReadWriteData(syncPushFn);
    syncTable.grantReadData(syncPullFn);
    syncTable.grantReadWriteData(syncDeleteFn);

    // ---------------------------------------------------------------
    // API Gateway — REST API with Cognito authorizer
    // ---------------------------------------------------------------
    const api = new apigw.RestApi(this, "SyncApi", {
      restApiName: "porthole-sync-api",
      description: "Porthole profile sync API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, "CognitoAuth", {
      cognitoUserPools: [userPool],
    });

    const authMethodOptions: apigw.MethodOptions = {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    };

    // POST /sync/push   — push local changes to cloud
    // GET  /sync/pull   — pull latest from cloud
    // POST /sync/delete — delete a synced record
    const syncResource = api.root.addResource("sync");

    syncResource
      .addResource("push")
      .addMethod("POST", new apigw.LambdaIntegration(syncPushFn), authMethodOptions);

    syncResource
      .addResource("pull")
      .addMethod("GET", new apigw.LambdaIntegration(syncPullFn), authMethodOptions);

    syncResource
      .addResource("delete")
      .addMethod("POST", new apigw.LambdaIntegration(syncDeleteFn), authMethodOptions);

    // ---------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "CognitoDomain", {
      value: `${domain.domainName}.auth.${this.region}.amazoncognito.com`,
    });
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    new cdk.CfnOutput(this, "SyncTableName", { value: syncTable.tableName });
  }
}

const app = new cdk.App();
new PortholeStack(app, "PortholeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
