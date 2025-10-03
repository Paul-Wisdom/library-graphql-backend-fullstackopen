const typeDefs = `
  type Book {
    id: ID!
    title: String!
    author: Author!
    published: Int!
    genres: [String!]!
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks (genre: String, author: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook (title: String!, author: String!, published: Int!, genres: [String!]!): [Book!]!
    editAuthor(name: String!, setBornTo: Int!): Author
    createUser (username: String!, favoriteGenre: String!): User
    login (username: String!, password: String!): Token
    clearDB: String
  }

  type Subscription {
    bookAdded: Book!
  }
`

module.exports = {typeDefs}