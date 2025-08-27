export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/realtime-comments',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
});
