const { ApolloServer } = require('@apollo/server')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
const { expressMiddleware } = require('@as-integrations/express5')

const { mongo, default: mongoose } = require('mongoose')

const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

const  {makeExecutableSchema} = require('@graphql-tools/schema')
const { GraphQLError } = require('graphql')

const { useServer } = require('graphql-ws/use/ws')
const { WebSocketServer } = require('ws')

const jwt = require('jsonwebtoken')
const express = require('express')
const http = require('http')
const cors = require('cors')

const {typeDefs} = require('./graphql/schema')
const {resolvers} = require('./graphql/resolvers')

require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI
mongoose.connect(MONGODB_URI).then(() => {
  console.log('connected to mongo DB at: ', MONGODB_URI)
}).catch((e) => {
  console.log('Error connecting to db',e.message)
})

const start = async () => {
  const app = express()
  const httpServer = http.createServer(app)

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/'
  })

  const schema = makeExecutableSchema({typeDefs, resolvers})
  const serverCleanup = useServer({schema}, wsServer)

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({httpServer}),
      {
        async serverWillStart(){
          return{
            async drainServer(){
              await serverCleanup.dispose()
            }
          }
        }
      }
    ]
  })

  await server.start()

  app.use('/',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
      const auth = req.headers.authorization
      console.log(auth)
      if (auth && auth.startsWith('Bearer ')) {
        const token = auth.split(' ')[1]
        console.log(token)
        try {
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
          console.log(decodedToken)
          const userId = decodedToken.id

          const currentUser = await User.findOne({_id: userId})
          return {currentUser}
        }catch(error){
          console.log(error)
          throw new GraphQLError('Invalid Token', {
            extensions:{
              code: 'UNAUTHORIZED',
              error
            }
          })
        }   
      }
    }
    })
  )

  const PORT = 4000
  httpServer.listen(PORT, () => {
    console.log(`Server is now running on http://localhost:${PORT}`)
  })
}

start()


