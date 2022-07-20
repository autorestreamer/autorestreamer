import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export default NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.discriminator = profile.discriminator
	token.full_username = profile.username + "#" + profile.discriminator
      }
      return token
    },
    async session({ session, token, user }) {
      session.user.discriminator = token.discriminator
      session.user.full_username = token.full_username
      return session
    }
  }
})
