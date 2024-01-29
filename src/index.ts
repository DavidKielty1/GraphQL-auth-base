import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs, resolvers } from './graphql';
import { GqlContext } from './graphql/types';
import * as dotenv from 'dotenv';
dotenv.config();

const server = new ApolloServer<GqlContext>({ typeDefs, resolvers });
// const port = Number(process.env.PORT ?? 8080);
const startServer = async () => {
  const { url } = await startStandaloneServer(server, {
    // listen: { host: '0.0.0.0', port },
    listen: { host: '0.0.0.0', port: 8080 },

    context: async () => {
      return {};
    },
  });
  console.log(`Server running at ${url}`);
};
startServer();
