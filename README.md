# Web Application

## Deployment

The application can be deployed to different environments using the deployment script:

### Staging Deployment
```bash
./stage-deploy.sh stage
```
This will deploy to staging environment using `stageapi.auth.chronon.co.in` as the API endpoint.

### Production Deployment
```bash
./stage-deploy.sh prod
```
This will deploy to production environment using `api.auth.chronon.co.in` as the API endpoint.

### Environment Variables
The deployment script automatically sets the following environment variables based on the deployment environment:

- **Staging**: 
  - `VITE_API_BASE_URL=https://stageapi.auth.chronon.co.in`
  - `VITE_API_BASE_URL_V2=https://stageapi.auth.chronon.co.in`

- **Production**:
  - `VITE_API_BASE_URL=https://api.auth.chronon.co.in`
  - `VITE_API_BASE_URL_V2=https://api.auth.chronon.co.in`