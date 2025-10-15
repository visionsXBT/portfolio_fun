# MongoDB Setup

## Environment Variables

Create a `.env.local` file in your project root with:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=portfolio_fun
```

## Local Development

1. Install MongoDB locally or use Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

2. Start your Next.js app:
```bash
npm run dev
```

## Production (MongoDB Atlas)

1. Create a MongoDB Atlas account at https://cloud.mongodb.com
2. Create a cluster and get your connection string
3. Set environment variables in Vercel:
   - `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/`
   - `MONGODB_DB=portfolio_fun`

## Database Schema

The app uses a `users` collection with documents like:
```json
{
  "_id": "ObjectId",
  "username": "string",
  "passwordHash": "string", 
  "createdAt": "ISO string",
  "portfolios": [
    {
      "id": "string",
      "name": "string",
      "rows": [{"mint": "string"}],
      "isExpanded": "boolean"
    }
  ]
}
```
