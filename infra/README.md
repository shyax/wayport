# Porthole Sync Infrastructure

AWS infrastructure for optional cloud sync. The desktop app works fully offline without this.

## Architecture

```
Desktop App ──► API Gateway ──► Lambda ──► DynamoDB
                    │
              Cognito Auth
```

- **Cognito** — user auth (email + OAuth, PKCE flow)
- **API Gateway** — REST API with Cognito authorizer
- **Lambda** (3 functions) — sync-push, sync-pull, sync-delete
- **DynamoDB** — profile/folder/environment storage (pay-per-request)

## Deploy

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

## After deployment

Copy the outputs into your desktop app build environment:

```bash
VITE_COGNITO_USER_POOL_ID=<UserPoolId>
VITE_COGNITO_CLIENT_ID=<UserPoolClientId>
VITE_COGNITO_DOMAIN=<CognitoDomain>
VITE_SYNC_API_URL=<ApiUrl>
```

### Deploying Lambda code

Terraform provisions placeholder Lambdas. To deploy the real handlers:

```bash
cd infra
npm install
npx esbuild lambda/sync-push.ts --bundle --platform=node --target=node20 --outfile=.build/sync-push/index.js
npx esbuild lambda/sync-pull.ts --bundle --platform=node --target=node20 --outfile=.build/sync-pull/index.js
npx esbuild lambda/sync-delete.ts --bundle --platform=node --target=node20 --outfile=.build/sync-delete/index.js

# Then update each Lambda
aws lambda update-function-code --function-name porthole-sync-push --zip-file fileb://.build/sync-push.zip
aws lambda update-function-code --function-name porthole-sync-pull --zip-file fileb://.build/sync-pull.zip
aws lambda update-function-code --function-name porthole-sync-delete --zip-file fileb://.build/sync-delete.zip
```

## Estimated cost

| Service     | <1K users/mo |
|-------------|-------------|
| Cognito     | Free (50K MAU free tier) |
| API Gateway | ~$1-3 |
| Lambda      | ~$0 (1M free invocations) |
| DynamoDB    | ~$1-3 (on-demand) |
| **Total**   | **~$1-5/mo** |
