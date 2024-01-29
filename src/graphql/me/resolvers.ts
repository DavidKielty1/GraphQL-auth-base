import { GqlResolvers } from '../../generated/graphql';

const meResolvers: GqlResolvers = {
  Query: {
    // TODO
    me: (_, __, { currentUser }) => {
      return currentUser;
    },
  },
};

export default meResolvers;
