import bcrypt from 'bcrypt';
import { DateTime } from 'luxon';
import { GraphQLError } from 'graphql';
import { GqlResolvers } from '../../generated/graphql';
import db, { genId } from '../../modules/db';
import { nanoid } from 'nanoid';
import Auth from '../../modules/auth';

const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 10;

const authResolvers: GqlResolvers = {
  Mutation: {
    requestSignUp: async (_, { email }) => {
      // Does user exist?
      const user = await db.user.findUnique({ where: { email } });
      if (user) throw new GraphQLError('User already exists');

      // Does request exist?
      await db.signUpRequest.deleteMany({ where: { email } });

      // Create new signup request
      const token = nanoid(36);
      await db.signUpRequest.create({
        data: {
          id: genId(),
          email,
          tokenHash: await bcrypt.hash(token, SALT_ROUNDS),
          expiresAt: DateTime.now().plus({ minutes: 10 }).toJSDate(),
        },
      });

      //Send token to user
      if (process.env.NODE_ENV === 'development') {
        console.log('Token', token);
      }

      return { success: true };
    },

    signUp: async (_, { token, email, password }) => {
      const request = await db.signUpRequest.findUnique({ where: { email } });
      if (!request) throw new GraphQLError('Sign up request not found');

      if (request.expiresAt < new Date())
        throw new GraphQLError('Sign up request expired');

      if (request.redeemedAt || request.expiresAt < new Date())
        throw new GraphQLError('Token has already been redeemed');

      // Compare token with tokenHash
      const validToken = await bcrypt.compare(token, request.tokenHash);
      if (!validToken) throw new GraphQLError('Invalid token');

      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) throw new GraphQLError('User already exists');

      // Create user
      const [user] = await db.$transaction([
        db.user.create({
          data: {
            id: genId(),
            email,
            passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
          },
        }),
        db.signUpRequest.update({
          where: { id: request.id },
          data: { redeemedAt: new Date() },
        }),
      ]);

      return { authToken: Auth.createAuthToken(user) };
    },

    signIn: async (_, { email, password }) => {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) throw new GraphQLError('Email/password combination invalid');

      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword)
        throw new GraphQLError('Email/password combination invalid');

      return { authToken: Auth.createAuthToken(user) };
    },
  },
};

export default authResolvers;
