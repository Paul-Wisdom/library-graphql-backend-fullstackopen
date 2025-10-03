const  { PubSub } =  require('graphql-subscriptions')

const Book = require('../models/book')
const Author = require('../models/author')
const { GraphQLError } = require('graphql')
const User = require('../models/user')
const jwt = require('jsonwebtoken')

const pubsub = new PubSub()

require('dotenv').config()
const resolvers = {
  Query: {
    bookCount: async () => (await Book.find({})).length,
    authorCount: async () => (await Author.find({})).length,
    allBooks: async (root, args) => {
      if (args.author) {
        const [author] = await Author.find({ name: args.author })
        if (!author) return []
        return Book.find({ author: author }).populate('author')
      }
      if (args.genre) {
        console.log(args.genre)
        const genreBooks = await Book.find({ genres: args.genre }).populate('author')
        console.log(genreBooks);
        return genreBooks
      }
      return await (Book.find({}).populate('author'))
    },
    allAuthors: async () => {
      const updatedAuthors = await Promise.all((await Author.find({})).map(async (author) => {
        const authorBooks = await Book.find({ author: author })
        const bookCount = authorBooks.length
        return { id:author._id, born: author.born, name: author.name, bookCount: bookCount }
      }))
      console.log(updatedAuthors)
      return updatedAuthors
    },
    me: (root, args, { currentUser }) => currentUser
  },
  Book: {
    author: async (root) => {
      console.log(root)
      return {name: root.author.name, id: root.author._id, born: root.author.born}
    }
  },
  Mutation: {
    addBook: async (root, args, {currentUser}) => {
      if(!currentUser){
        throw new GraphQLError('Unauthorized', {
          extensions: {
            code: 'UNAUTHORIZED'
          }
        })
      }
      let author
      const [existingAuthor] = await Author.find({ name: args.author });
      if (!existingAuthor) {
        try {
          const newAuthor = new Author({ name: args.author });
          author = await newAuthor.save();
        } catch (error) {
          console.log(error)
          throw new GraphQLError('Author name must be a minimum of 4 characters long', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.author,
              error
            }
          })
        }
      }
      else {
        author = existingAuthor
      }
      try {
        const newBook = new Book({ title: args.title, published: args.published, genres: args.genres, author: author })
        await newBook.save()
        pubsub.publish('BOOK_ADDED', {bookAdded: newBook})
        return await Book.find({}).populate('author')
      } catch (error) {
        console.log(error)
        throw new GraphQLError('Book title must be a minimum of 5 characters long', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.title,
            error
          }
        })
      }

    },
    editAuthor: async (root, args, {currentUser}) => {
      if(!currentUser){
        throw new GraphQLError('Unauthorized', {
          extensions: {
            code: 'UNAUTHORIZED'
          }
        })
      }
      const [existingAuthor] = await Author.find({ name: args.name })
      if (!existingAuthor) {
        return null
      }
      existingAuthor.born = args.setBornTo;
      const savedAuthor = await existingAuthor.save()
      return savedAuthor
    },
    createUser: async (root, args) => {
      try {
        const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })
        return user.save()
      } catch (error) {
        console.log(error)
        throw new GraphQLError('username already in use', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.username,
            error
          }
        })
      }
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (user && args.password === 'secret') {
        const token = jwt.sign({ username: user.username, id: user._id }, process.env.JWT_SECRET)
        return { value: token }
      }
      throw new GraphQLError('wrong username or password', {
        extensions: {
          code: 'BAD_USER_INPUT',
          invalidArgs: [args.username, args.password]
        }
      })
    },
    clearDB: async (root, args) => {
      await Book.deleteMany({})
      return 'cleared'
    }
  },

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator('BOOK_ADDED')
    }
  }
}

module.exports = {resolvers}